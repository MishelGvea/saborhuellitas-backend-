/*
 * Proyecto Huellitas - Dispensador IoT
 * 
 * Este sketch controla un dispensador de alimento para mascotas
 * utilizando un ESP32, sensores y MQTT para la comunicación.
 */

 #include <WiFi.h>
 #include <PubSubClient.h>
 #include <ESP32Servo.h>
 #include "HX711.h"
 
 // ============= CONFIGURACIÓN WIFI =============
 const char* ssid = "RosyCuartos";  // Cambia a tu nombre de red WiFi
 const char* password = "Irina11022023";  // Cambia a tu contraseña WiFi
 
 // ============= CONFIGURACIÓN MQTT =============
 const char* mqttServer = "192.168.68.113";  // Cambia a la IP de tu broker Mosquitto
 const int mqttPort = 1883;
 const char* mqttClientId = "huellitas";  // ID del cliente MQTT
 
 // Topic raíz para todos los datos
 const char* TOPIC_RAIZ = "esp32";
 
 // ============= CONFIGURACIÓN DE PINES =============
 // Servo
 #define SERVO_PIN 15
 
 // Sensor ultrasónico
 #define TRIG_PIN 14
 #define ECHO_PIN 25
 
 // LEDs indicadores
 #define LED_VERDE 12
 #define LED_AMARILLO 13
 #define LED_ROJO 26
 
 // Sensor de peso HX711
 #define HX711_DOUT 22
 #define HX711_SCK 21
 
 // ============= VARIABLES GLOBALES =============
 WiFiClient espClient;
 PubSubClient client(espClient);
 Servo miServo;
 HX711 bascula;
 
 // Variables para la calibración del sensor de peso
 float factorCalibracion = 387.25;  // Ajusta este valor según la calibración de tu sensor
 
 // Variables para el control del dispensador
 float pesoActual = 0.0;
 float pesoObjetivo = 0.0;
 float distancia_cm = 0.0;
 String estadoAlimento = "desconocido";
 String colorLed = "desconocido";
 bool dispensacionActiva = false;
 unsigned long ultimaDispensacion = 0;
 bool servoAbierto = false;
 
 // Variables para el control de tiempos
 unsigned long ultimaMedicion = 0;
 unsigned long tiempoInicioDispensacion = 0;
 unsigned long tiempoMaximoDispensacion = 10000;  // 10 segundos máximo para dispensar
 unsigned long ultimoHeartbeat = 0;
 unsigned long intervaloHeartbeat = 30000;  // 30 segundos entre heartbeats
 
 // Variables para la dirección MAC
 char mac[18];
 
 // ============= FUNCIONES DE CONFIGURACIÓN =============
 
 // Función para publicar a un subtopic del topic raíz
 void publicar(const char* subtopic, const char* mensaje) {
   String topic = String(TOPIC_RAIZ) + "/" + String(subtopic);
   client.publish(topic.c_str(), mensaje);
   
   Serial.print("📤 Publicado [");
   Serial.print(topic);
   Serial.print("]: ");
   Serial.println(mensaje);
 }
 
 // Configuración de la conexión WiFi
 void setupWiFi() {
   delay(10);
   Serial.println();
   Serial.print("📡 Conectando a WiFi: ");
   Serial.println(ssid);
 
   WiFi.begin(ssid, password);
 
   int intentos = 0;
   while (WiFi.status() != WL_CONNECTED && intentos < 20) {
     delay(500);
     Serial.print(".");
     intentos++;
   }
 
   if (WiFi.status() == WL_CONNECTED) {
     Serial.println("\n✅ WiFi conectado");
     Serial.print("📱 Dirección IP: ");
     Serial.println(WiFi.localIP());
     
     // Obtener dirección MAC
     uint8_t macAddr[6];
     WiFi.macAddress(macAddr);
     snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
              macAddr[0], macAddr[1], macAddr[2], 
              macAddr[3], macAddr[4], macAddr[5]);
     Serial.print("📟 Dirección MAC: ");
     Serial.println(mac);
   } else {
     Serial.println("\n❌ Error: No se pudo conectar a WiFi");
   }
 }
 
 // Reconexión al broker MQTT
 void reconnectMQTT() {
   while (!client.connected()) {
     Serial.print("🔌 Conectando a MQTT...");
     
     // Crear un ID de cliente único usando la MAC
     String clientId = String(mqttClientId) + "-" + mac;
     
     if (client.connect(clientId.c_str())) {
       Serial.println("✅ Conectado al broker MQTT");
       
       // Publicar información de conexión
       publicarInfoDispositivo();
       
       // Suscribirse al tópico de comandos
       String comandoTopic = String(TOPIC_RAIZ) + "/comando";
       client.subscribe(comandoTopic.c_str());
 
       // Publicar el estado inicial del servo
       if (servoAbierto) {
         publicar("servo", "abierto");
       } else {
         publicar("servo", "cerrado");
       }
     } else {
       Serial.print("❌ Falló conexión MQTT, estado: ");
       Serial.print(client.state());
       Serial.println(" Reintentando en 5 segundos...");
       delay(5000);
     }
   }
 }
 
 // Publicar información del dispositivo
 void publicarInfoDispositivo() {
   // Publicar IP y MAC
   publicar("ip", WiFi.localIP().toString().c_str());
   publicar("mac", mac);
   
   Serial.println("📤 Info dispositivo publicada");
 }
 
 // Función de callback para procesar mensajes MQTT recibidos
 void callback(char* topic, byte* payload, unsigned int length) {
   // Convertir el payload a string para procesarlo
   String mensaje = "";
   for (unsigned int i = 0; i < length; i++) {
     mensaje += (char)payload[i];
   }
   
   Serial.print("📩 Mensaje recibido en [");
   Serial.print(topic);
   Serial.print("]: ");
   Serial.println(mensaje);
 
   // Verificar si el mensaje es para el topic de comando
   String topicStr = String(topic);
   String comandoTopic = String(TOPIC_RAIZ) + "/comando";
   
   if (topicStr == comandoTopic) {
     if (mensaje == "dispensar") {
       // Solo permitir dispensar si no se está dispensando actualmente
       if (!dispensacionActiva) {
         Serial.println("🥣 Dispensando 50 gramos de alimento...");
         iniciarDispensacionPorPeso(50);
         
         // Registrar el tiempo de la última dispensación
         ultimaDispensacion = millis();
         
         // Publicar el comando recibido
         publicar("comando", "dispensar");
       } else {
         Serial.println("⚠️ Ya se está dispensando, ignorando comando");
       }
     }
     else if (mensaje == "restart") {
       Serial.println("🔄 Reiniciando huellitas...");
       publicar("comando", "restart");
       ESP.restart();
     }
   }
 }
 
 // ============= FUNCIONES PARA SENSORES =============
 
 // Redondear un valor a múltiplos de 10
 int redondearAMultiplosDe10(float valor) {
   return round(valor / 10.0) * 10;
 }
 
 // Medir distancia con el sensor ultrasónico
 void medirDistancia() {
   // Generar pulso ultrasónico
   digitalWrite(TRIG_PIN, LOW);
   delayMicroseconds(2);
   digitalWrite(TRIG_PIN, HIGH);
   delayMicroseconds(10);
   digitalWrite(TRIG_PIN, LOW);
   
   // Medir tiempo de retorno del eco
   long duracion = pulseIn(ECHO_PIN, HIGH, 30000);
   
   // Si no hay retorno, no actualizar
   if (duracion == 0) return;
 
   // Calcular distancia
   distancia_cm = (duracion * 0.0343) / 2;
   
   Serial.print("📏 Distancia: ");
   Serial.print(distancia_cm);
   Serial.println(" cm");
 
   // Actualizar estado de LEDs según la distancia
   actualizarEstadoLEDs();
   
   // Publicar distancia a MQTT (valor numérico)
   char distanciaStr[10];
   sprintf(distanciaStr, "%.1f", distancia_cm);
   publicar("distancia", distanciaStr);
 }
 
 // Actualizar estado de LEDs según la distancia medida
 void actualizarEstadoLEDs() {
   // Definir estados según la distancia
   if (distancia_cm <= 5) {
     // Contenedor lleno
     colorLed = "verde";
     digitalWrite(LED_VERDE, HIGH);
     digitalWrite(LED_AMARILLO, LOW);
     digitalWrite(LED_ROJO, LOW);
   } else if (distancia_cm > 5 && distancia_cm <= 12) {
     // Contenedor medio lleno
     colorLed = "amarillo";
     digitalWrite(LED_VERDE, LOW);
     digitalWrite(LED_AMARILLO, HIGH);
     digitalWrite(LED_ROJO, LOW);
   } else {
     // Contenedor vacío
     colorLed = "rojo";
     digitalWrite(LED_VERDE, LOW);
     digitalWrite(LED_AMARILLO, LOW);
     digitalWrite(LED_ROJO, HIGH);
   }
   
   // Publicar el estado del LED
   publicar("led", colorLed.c_str());
 }
 
 // Medir peso con el sensor HX711
 void medirPeso() {
   if (bascula.is_ready()) {
     // Tomar 3 lecturas para mayor estabilidad
     float pesoMedido = bascula.get_units(3);
     
     // Evitar valores negativos
     if (pesoMedido < 0) pesoMedido = 0;
     
     // Redondear a múltiplos de 10
     pesoActual = redondearAMultiplosDe10(pesoMedido);
     
     Serial.print("⚖ Peso: ");
     Serial.print(pesoActual);
     Serial.println(" g");
 
     // Publicar peso a MQTT (solo el valor numérico)
     char pesoStr[10];
     sprintf(pesoStr, "%d", (int)pesoActual);
     publicar("dispensador", pesoStr);
   } else {
     Serial.println("❌ Error: Sensor de peso no disponible");
   }
 }
 
 // ============= FUNCIONES PARA EL DISPENSADOR =============
 
 // Iniciar dispensación por peso objetivo - Solo para 50g
 void iniciarDispensacionPorPeso(int gramos) {
   // Imprimir información detallada para debug
   Serial.print("🔍 Peso actual: ");
   Serial.print(pesoActual);
   Serial.println(" g");
   
   // Establecer el peso objetivo (redondeado a múltiplos de 10)
   pesoObjetivo = pesoActual + gramos;
   
   Serial.print("🎯 Peso objetivo: ");
   Serial.print(pesoObjetivo);
   Serial.println(" g");
   
   // Activar la dispensación
   dispensacionActiva = true;
   tiempoInicioDispensacion = millis();
   
   // Abrir el servo
   abrirServo();
 }
 
 // Abrir el servo del dispensador
 void abrirServo() {
   if (!servoAbierto) {
     miServo.write(120);  // Posición abierta (ajustar según tu servo)
     publicar("servo", "abierto");
     servoAbierto = true;
     Serial.println("🔓 Servo ABIERTO");
   }
 }
 
 // Cerrar el servo del dispensador
 void cerrarServo() {
   if (servoAbierto) {
     miServo.write(35);  // Posición cerrada (ajustar según tu servo)
     publicar("servo", "cerrado");
     servoAbierto = false;
     Serial.println("🔒 Servo CERRADO");
   }
 }
 
 // ============= CONFIGURACIÓN INICIAL =============
 void setup() {
   // Iniciar comunicación serial
   Serial.begin(115200);
   Serial.println("\n\n🚀 Iniciando sistema Huellitas - Dispensador IoT");
   
   // Configurar pines
   pinMode(TRIG_PIN, OUTPUT);
   pinMode(ECHO_PIN, INPUT);
   pinMode(LED_VERDE, OUTPUT);
   pinMode(LED_AMARILLO, OUTPUT);
   pinMode(LED_ROJO, OUTPUT);
   
   // Inicializar LEDs
   digitalWrite(LED_VERDE, LOW);
   digitalWrite(LED_AMARILLO, LOW);
   digitalWrite(LED_ROJO, LOW);
   
   // Configurar servo
   ESP32PWM::allocateTimer(0);
   miServo.setPeriodHertz(50);  // Frecuencia estándar para servos
   miServo.attach(SERVO_PIN, 500, 2400);  // Ajustar según especificaciones del servo
   miServo.write(35);  // Posición inicial cerrada
   servoAbierto = false;
   
   // Inicializar sensor de peso HX711
   bascula.begin(HX711_DOUT, HX711_SCK);
   bascula.set_scale(factorCalibracion);
   bascula.tare();  // Tara inicial (asegúrate de que no haya peso en la báscula)
   
   // Configurar WiFi
   setupWiFi();
   
   // Configurar MQTT
   client.setServer(mqttServer, mqttPort);
   client.setCallback(callback);
   
   Serial.println("⚙️ Configuración completada");
 }
 
 // ============= BUCLE PRINCIPAL =============
 void loop() {
   // Verificar conexión WiFi
   if (WiFi.status() != WL_CONNECTED) {
     Serial.println("❌ Conexión WiFi perdida. Reconectando...");
     setupWiFi();
   }
   
   // Verificar conexión MQTT
   if (!client.connected()) {
     reconnectMQTT();
   }
   client.loop();
   
   // Obtener tiempo actual
   unsigned long tiempoActual = millis();
   
   // Enviar heartbeat periódicamente
   if (tiempoActual - ultimoHeartbeat >= intervaloHeartbeat) {
     ultimoHeartbeat = tiempoActual;
     Serial.println("💓 Enviando heartbeat");
     
     // Refrescar información del dispositivo periódicamente
     publicarInfoDispositivo();
   }
   
   // Modo de operación según estado del dispensador
   if (dispensacionActiva) {
     // Mientras se está dispensando, medir peso con mayor frecuencia
     if (tiempoActual - ultimaMedicion >= 20) {  // Cada 20ms
       ultimaMedicion = tiempoActual;
       medirPeso();
       
       // Verificar si se alcanzó el peso objetivo o se excedió el tiempo máximo
       if (pesoActual >= pesoObjetivo || (tiempoActual - tiempoInicioDispensacion > tiempoMaximoDispensacion)) {
         cerrarServo();
         dispensacionActiva = false;
         
         // Registrar resultado de la dispensación
         Serial.print("✅ Dispensación completada. Peso final: ");
         Serial.print(pesoActual);
         Serial.println(" g");
       }
     }
   } else {
     // En modo normal, medir sensores periódicamente
     if (tiempoActual - ultimaMedicion >= 500) {  // Cada 500ms
       ultimaMedicion = tiempoActual;
       medirDistancia();
       medirPeso();
     }
     
     // Por seguridad, verificar que el servo esté cerrado si no estamos dispensando
     if (servoAbierto && (tiempoActual - tiempoInicioDispensacion > tiempoMaximoDispensacion)) {
       Serial.println("⚠️ Servo quedó abierto - cerrando por seguridad");
       cerrarServo();
     }
   }
 }