// Robot arm bench test — Arduino Uno/Nano, 5x MG90S on pins 3,5,6,9,10.
// Power the servos from a separate 5-6 V / 3 A supply; tie its GND to Arduino GND.
//
// Serial monitor (115200, "Newline"):
//   <joint> <angle>   e.g. "2 120"   joint 1..5, angle 0..180 (moves smoothly)
//   home              all joints to HOME
//   demo              pick-and-place style loop (send any key to stop)
#include <Servo.h>

const uint8_t PINS[5]  = {3, 5, 6, 9, 10};
const uint8_t HOME[5]  = {90, 90, 90, 90, 60};    // base, shoulder, elbow, wrist, gripper
const uint8_t MIN_A[5] = {0, 10, 10, 10, 30};     // soft limits — tune after first assembly
const uint8_t MAX_A[5] = {180, 170, 170, 170, 120};
const uint8_t STEP_MS  = 12;                      // lower = faster

Servo sv[5];
int pos[5];

void moveTo(uint8_t j, int target) {
  target = constrain(target, MIN_A[j], MAX_A[j]);
  while (pos[j] != target) {
    pos[j] += (target > pos[j]) ? 1 : -1;
    sv[j].write(pos[j]);
    delay(STEP_MS);
  }
}

void moveAll(const int t[5]) { for (uint8_t j = 0; j < 5; j++) moveTo(j, t[j]); }

void setup() {
  Serial.begin(115200);
  for (uint8_t j = 0; j < 5; j++) { pos[j] = HOME[j]; sv[j].attach(PINS[j]); sv[j].write(pos[j]); }
  Serial.println(F("Arm ready. '<joint 1-5> <angle>', 'home', 'demo'"));
}

void demo() {
  const int P[][5] = {
    {90, 90, 90, 90, 100}, {45, 60, 60, 80, 100}, {45, 50, 50, 70, 40},
    {45, 90, 90, 90, 40},  {135, 60, 60, 80, 40}, {135, 60, 60, 80, 100}, {90, 90, 90, 90, 60}};
  while (!Serial.available())
    for (auto &p : P) { moveAll(p); delay(300); if (Serial.available()) break; }
  while (Serial.available()) Serial.read();
}

void loop() {
  if (!Serial.available()) return;
  String s = Serial.readStringUntil('\n'); s.trim();
  if (s == "home") { int h[5]; for (int j = 0; j < 5; j++) h[j] = HOME[j]; moveAll(h); }
  else if (s == "demo") demo();
  else {
    int sp = s.indexOf(' ');
    int j = s.substring(0, sp).toInt() - 1, a = s.substring(sp + 1).toInt();
    if (sp > 0 && j >= 0 && j < 5) moveTo(j, a);
  }
  for (int j = 0; j < 5; j++) { Serial.print(pos[j]); Serial.print(j < 4 ? ' ' : '\n'); }
}
