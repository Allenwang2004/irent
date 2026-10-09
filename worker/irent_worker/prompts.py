"""Prompts and JSON schemas sent to the VLM.

The compare prompt is copied verbatim from eval/compare_eval.py so the
recall and false-positive numbers measured there describe what this worker
does in production. Change both together, and re-run the eval after any edit.
"""

# ---------------------------------------------------------------- compare
# Same as eval/compare_eval.py: DAMAGE_TYPES, SCHEMA, SYSTEM, INSTRUCTION.

DAMAGE_TYPES = ["刮傷", "凹陷", "破裂", "掉漆", "燈具破損", "其他"]

COMPARE_SCHEMA = {
    "type": "object",
    "properties": {
        "observation": {"type": "string"},
        "comparable": {"type": "boolean"},
        "new_damage": {"type": "boolean"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "type": {"type": "string", "enum": DAMAGE_TYPES},
                    "severity": {"type": "string", "enum": ["輕微", "中等", "嚴重"]},
                },
                "required": ["location", "type", "severity"],
                "additionalProperties": False,
            },
        },
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason": {"type": "string"},
    },
    "required": ["observation", "comparable", "new_damage", "items", "confidence", "reason"],
    "additionalProperties": False,
}

COMPARE_SYSTEM = "你是租車公司的車況檢查員，負責比對同一台車在租車前後的照片，找出這次租車期間新產生的車損。"

COMPARE_INSTRUCTION = f"""請比對上面兩張照片，以 JSON 回答：

- observation：先分別描述兩張照片拍到車子的哪個部位、角度，以及各自看得到的損傷。
- comparable：兩張照片是否拍到同一區域、足以比對。若還車照的可疑區域在取車照中看不到，填 false。
- new_damage：還車照中是否有「取車照沒有」的新損傷。取車照已存在的舊傷不算。
- items：每一處新損傷的位置（用鈑件名稱，例如「左前保險桿」、「右後車門」）、類型（限 {"、".join(DAMAGE_TYPES)}）、嚴重度。沒有則為空陣列。
- confidence：對 new_damage 判斷的信心，0 到 1。
- reason：用繁體中文說明判斷理由。

注意：反光、倒影、水漬、灰塵、陰影、光線與拍攝角度造成的差異都不是車損。"""

# The baseline is the previous return of the same car, which is the state the
# current renter received it in, so it plays the "取車照" role in the prompt.
COMPARE_BEFORE_LABEL = "第一張：取車照（本次租車開始時拍攝）"
COMPARE_AFTER_LABEL = "第二張：還車照（本次租車結束時拍攝）"

# ---------------------------------------------------------------- tidy
# Not yet evaluated; build a labelled set and measure it like compare before
# relying on it.

TIDY_LEVELS = ["乾淨", "普通", "髒汙"]
TIDY_ISSUE_TYPES = ["垃圾", "污漬", "泥沙", "食物殘渣", "其他"]

TIDY_SCHEMA = {
    "type": "object",
    "properties": {
        "observation": {"type": "string"},
        "level": {"type": "string", "enum": TIDY_LEVELS},
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "type": {"type": "string", "enum": TIDY_ISSUE_TYPES},
                },
                "required": ["location", "type"],
                "additionalProperties": False,
            },
        },
        "left_items": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason": {"type": "string"},
    },
    "required": ["observation", "level", "issues", "left_items", "confidence", "reason"],
    "additionalProperties": False,
}

TIDY_SYSTEM = "你是租車公司的清潔檢查員，負責從還車時拍的車內照片判斷整潔程度，決定下一位用戶取車前是否需要清潔。"

TIDY_INSTRUCTION = f"""請檢查上面這張車內照片，以 JSON 回答：

- observation：描述照片拍到車內的哪個區域，以及看得到的狀況。
- level：整潔程度，只能是 {"、".join(TIDY_LEVELS)} 其中之一。
  - 乾淨：沒有垃圾、污漬或明顯灰塵。
  - 普通：少量灰塵或輕微凌亂，下一位用戶可以接受，例行整備即可。
  - 髒汙：有垃圾、明顯污漬、食物殘渣或泥沙，需要立即清潔才能出租。
- issues：每一處髒污的位置（例如「駕駛座腳踏墊」、「後座椅面」）與類型（限 {"、".join(TIDY_ISSUE_TYPES)}）。沒有則為空陣列。
- left_items：乘客遺留的私人物品，例如手機、錢包、雨傘、衣物、包包。車上固定配備（例如加油卡夾、使用手冊）不算。沒有則為空陣列。
- confidence：對 level 判斷的信心，0 到 1。
- reason：用繁體中文說明判斷理由。

注意：光線昏暗、反光、座椅原本的花紋或磨損不算髒污。"""

# ---------------------------------------------------------------- card
# The fuel and parking cards live in a holder on the driver's sun visor. A
# missing card at pickup means the previous renter kept it; at return, this one.

CARD_SCHEMA = {
    "type": "object",
    "properties": {
        "observation": {"type": "string"},
        "holder_visible": {"type": "boolean"},
        "fuel_card": {"type": "boolean"},
        "parking_card": {"type": "boolean"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason": {"type": "string"},
    },
    "required": ["observation", "holder_visible", "fuel_card", "parking_card", "confidence", "reason"],
    "additionalProperties": False,
}

CARD_SYSTEM = "你是租車公司的車況檢查員，負責確認車上的加油卡和停車卡有沒有放在駕駛座遮陽板的卡夾裡。"

CARD_INSTRUCTION = """請檢查上面這張照片，以 JSON 回答：

- observation：描述照片拍到什麼，以及卡夾裡看得到的東西。
- holder_visible：照片是否清楚拍到遮陽板上的卡夾。
- fuel_card：卡夾裡是否看得到加油卡。
- parking_card：卡夾裡是否看得到停車卡。
- confidence：對判斷的信心，0 到 1。
- reason：用繁體中文說明判斷理由。

注意：只有看得到卡片本身才算在；卡夾上印的「加油卡」「停車卡」字樣不算卡片。"""

# ---------------------------------------------------------------- describe
# A close-up the renter took of damage they point out. There is no "before"
# photo of the same spot, so the model only describes what it sees.

DESCRIBE_SCHEMA = {
    "type": "object",
    "properties": {
        "observation": {"type": "string"},
        "damage_visible": {"type": "boolean"},
        "items": COMPARE_SCHEMA["properties"]["items"],
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason": {"type": "string"},
    },
    "required": ["observation", "damage_visible", "items", "confidence", "reason"],
    "additionalProperties": False,
}

DESCRIBE_SYSTEM = "你是租車公司的車況檢查員，負責判讀用戶拍下的車損特寫照片。"

DESCRIBE_INSTRUCTION = f"""用戶表示這張照片拍到一處車損。請以 JSON 回答：

- observation：描述照片拍到車子的哪個部位，以及看得到的狀況。
- damage_visible：照片中是否真的看得到損傷。
- items：每一處損傷的位置（用鈑件名稱，例如「左前保險桿」）、類型（限 {"、".join(DAMAGE_TYPES)}）、嚴重度。沒有則為空陣列。
- confidence：對 damage_visible 判斷的信心，0 到 1。
- reason：用繁體中文說明判斷理由。

注意：反光、倒影、水漬、灰塵、陰影不是車損。"""
