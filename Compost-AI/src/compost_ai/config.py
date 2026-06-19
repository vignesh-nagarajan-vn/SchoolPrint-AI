from pathlib import Path

# ── GPIO Pins ────────────────────────────────────────────────────────────────
TRIG_PIN             = 23
ECHO_PIN             = 24   # wire through 1kΩ/2kΩ voltage divider
SERVO_COMPOST_PIN    = 17
SERVO_RECYCLING_PIN  = 27
SERVO_GARBAGE_PIN    = 22

# ── LCD I2C ───────────────────────────────────────────────────────────────────
LCD_I2C_ADDRESS = 0x27   # run `i2cdetect -y 1` on the Pi to confirm this value
LCD_I2C_BUS     = 1

# ── Detection ────────────────────────────────────────────────────────────────
TRIGGER_DISTANCE_CM  = 15.0   # item detected when closer than this
CONFIDENCE_THRESHOLD = 0.65   # below this → prompt manual sort

# ── Servo ────────────────────────────────────────────────────────────────────
SERVO_OPEN_ANGLE   = 90
SERVO_CLOSED_ANGLE = 0
GATE_OPEN_SECONDS  = 2.0

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parents[3]
MODEL_PATH = ROOT / "Compost-AI" / "Models" / "quantized-tflite-weights.tflite"
LOG_PATH   = ROOT / "pulse-agent-ai" / "data" / "synthetic" / "waste_logs.csv"

# ── Model ────────────────────────────────────────────────────────────────────
IMG_SIZE = 224

CLASS_NAMES = sorted([
    "aerosol_cans", "aluminum_food_cans", "aluminum_soda_cans",
    "cardboard_boxes", "cardboard_packaging", "clothing", "coffee_grounds",
    "disposable_plastic_cutlery", "eggshells", "food_waste",
    "glass_beverage_bottles", "glass_cosmetic_containers", "glass_food_jars",
    "magazines", "newspaper", "office_paper", "paper_cups", "plastic_cup_lids",
    "plastic_detergent_bottles", "plastic_food_containers",
    "plastic_shopping_bags", "plastic_soda_bottles", "plastic_straws",
    "plastic_trash_bags", "plastic_water_bottles", "shoes", "steel_food_cans",
    "styrofoam_cups", "styrofoam_food_containers", "tea_bags",
])

DISPOSAL_MAP = {
    "aerosol_cans":              "Recycling",
    "aluminum_soda_cans":        "Recycling",
    "aluminum_food_cans":        "Recycling",
    "steel_food_cans":           "Recycling",
    "cardboard_boxes":           "Recycling",
    "cardboard_packaging":       "Recycling",
    "glass_beverage_bottles":    "Recycling",
    "glass_cosmetic_containers": "Recycling",
    "glass_food_jars":           "Recycling",
    "plastic_detergent_bottles": "Recycling",
    "plastic_soda_bottles":      "Recycling",
    "plastic_water_bottles":     "Recycling",
    "plastic_food_containers":   "Recycling",
    "newspaper":                 "Recycling",
    "office_paper":              "Recycling",
    "magazines":                 "Recycling",
    "paper_cups":                "Recycling",
    "styrofoam_cups":            "Garbage",
    "styrofoam_food_containers": "Garbage",
    "plastic_shopping_bags":     "Garbage",
    "plastic_straws":            "Garbage",
    "plastic_cup_lids":          "Garbage",
    "plastic_trash_bags":        "Garbage",
    "disposable_plastic_cutlery":"Garbage",
    "clothing":                  "Garbage",
    "shoes":                     "Garbage",
    "food_waste":                "Compost",
    "coffee_grounds":            "Compost",
    "eggshells":                 "Compost",
    "tea_bags":                  "Compost",
}

LOCATION = "Cafeteria Bin 1"
