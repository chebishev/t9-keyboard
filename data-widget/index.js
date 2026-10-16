import {
  createWidget,
  widget,
  keyboard,
  prop,
  event,
  align
} from '@zos/ui'
import { showToast } from "@zos/interaction";
import { styles } from "zosLoader:./index.[pf].layout.js"
import { LocalStorage } from "@zos/storage";
import { Vibrator } from '@zos/sensor'
import { getText } from "@zos/i18n"
import { enT9Engine, ruT9Engine } from './engine/t9-engine'; 
import { getDeviceInfo } from '@zos/device'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()
const IS_ROUND = DEVICE_WIDTH === DEVICE_HEIGHT

const localStorage = new LocalStorage()
const vibro = new Vibrator()

function vibrate() {
  vibro.setMode(27)
  vibro.start()
}

// Start keyboard with Uppercase letter
let shiftEnabled = true
let capsLockEnabled = false
let shiftImage = null
let deleteImage = null
let deleteButton = null
let globeImage = null
let actionImage = null
let hideDeleteOnRelease = false

let currentMultiTapKey = null
let currentMultiTapIndex = 0
let multiTapTimer = null
let pendingChar = ""
let t9Sequence = ""
let predictionBar = null
let predictionWidgets = []

let currentLanguage = "ru"

function getActiveT9Engine() {
  return currentLanguage === 'ru' ? ruT9Engine : enT9Engine;
}

let currentPredictions = []
const MAX_PREDICTIONS = 5
const PREDICTION_ITEM_WIDTH = px(85)
const PREDICTION_ITEM_GAP = px(8)

let predictionTouchOverlay = null
let predictionScrollOffset = 0

function getCurrentWordPrefix() {
  const text = keyboard.getTextContext() || ''

  // A trailing space means we're starting a new word.
  if (!pendingChar && /\s$/.test(text)) {
    return ''
  }

  const trimmed = text.trimEnd()
  if (!trimmed) {
    return ''
  }

  const words = trimmed.split(/\s+/)

  return (words[words.length - 1] || '').toLowerCase()
}

function updatePredictions() {
  const engine = getActiveT9Engine()
  const sequence = t9Sequence
  const language = currentLanguage
  const prefix = getCurrentWordPrefix()

  const letterMatches = prefix
    ? engine.dictionary.filter(word =>
      word.toLowerCase().startsWith(prefix)
    )
    : []

  if (!sequence) {
    currentPredictions = letterMatches.slice(0, MAX_PREDICTIONS)
    renderPredictions()
    return
  }

  engine.getSuggestions(
    sequence,
    prefix,
    MAX_PREDICTIONS,
    (t9Matches) => {
      if (
        sequence !== t9Sequence ||
        language !== currentLanguage ||
        prefix !== getCurrentWordPrefix()
      ) {
        return
      }

      const merged = [...letterMatches, ...t9Matches]

      currentPredictions = [
        ...new Set(merged),
      ].slice(0, MAX_PREDICTIONS)

      renderPredictions()
    }
  )
}

function selectPrediction(word) {
  if (!word) return

  // Commit the current multi-tap character first.
  if (pendingChar) {
    commitPendingChar()
  }

  const text = keyboard.getTextContext() || ''

  // Do not replace the previous word after a space.
  if (!text || /\s$/.test(text)) return

  const trimmed = text.trimEnd()
  const match = trimmed.match(/(\S+)$/)

  if (!match) return

  const currentWord = match[1]

  // Replace the complete current word.
  keyboard.backspace(currentWord.length)
  keyboard.inputText(word + ' ')

  // Reset prediction state for the next word.
  t9Sequence = ''
  currentPredictions = []

  renderPredictions()
  updateInputState()
  updatePredictions()
}


function getPredictionMaxOffset() {
  const contentWidth = getPredictionContentWidth()
  const bar = styles.prediction_bar

  let visibleRight = bar.x + bar.w

  if (IS_ROUND) {
    const radius = DEVICE_WIDTH / 2
    const predictionY = bar.y + (bar.h >> 1)
    const dy = predictionY - radius
    const safeWidth =
      Math.sqrt(radius * radius - dy * dy) * 2

    visibleRight =
      Math.floor(DEVICE_WIDTH / 2 + (safeWidth - 40) / 2)
  }

  return Math.min(
    0,
    visibleRight - (getPredictionStartX() + contentWidth)
  )
}

function getPredictionContentWidth() {
  const count = currentPredictions.length
  return count > 0
    ? count * PREDICTION_ITEM_WIDTH + (count - 1) * PREDICTION_ITEM_GAP
    : 0
}

function getPredictionStartX() {
  // Keep the first suggestion near the center on round screens;
  // on square screens, align the bar to its left edge.
  return IS_ROUND
    ? Math.floor(DEVICE_WIDTH / 2 - PREDICTION_ITEM_WIDTH / 2)
    : styles.prediction_bar.x
}

function updatePredictionWidgetPositions() {
  const bar = styles.prediction_bar
  const stride = PREDICTION_ITEM_WIDTH + PREDICTION_ITEM_GAP
  const startX = getPredictionStartX()

  for (let i = 0; i < predictionWidgets.length; i++) {
    const item = predictionWidgets[i]
    if (!item) continue

    item.setProperty(prop.MORE, {
      x: startX + predictionScrollOffset + i * stride,
      y: bar.y,
      w: PREDICTION_ITEM_WIDTH,
      h: bar.h,
    })
  }
}

function setupPredictionTouchHandlers() {
  const bar = styles.prediction_bar

  predictionTouchOverlay = createWidget(widget.FILL_RECT, {
    parent: predictionBar,
    x: bar.x,
    y: bar.y,
    w: bar.w,
    h: bar.h,
    alpha: 0,
  })

  let startX = null
  let lastX = 0
  let startTime = 0
  let didSwipe = false

  predictionTouchOverlay.addEventListener(event.CLICK_DOWN, (info) => {
    startX = info.x
    lastX = info.x
    startTime = Date.now()
    didSwipe = false
  })

  predictionTouchOverlay.addEventListener(event.MOVE, (info) => {
    if (startX === null) return

    const deltaX = info.x - lastX

    if (Math.abs(info.x - startX) > 12) {
      didSwipe = true
    }

    if (didSwipe) {
      predictionScrollOffset += deltaX

      const minOffset = getPredictionMaxOffset()

      predictionScrollOffset = Math.max(
        minOffset,
        Math.min(0, predictionScrollOffset)
      )

      updatePredictionWidgetPositions()
    }

    lastX = info.x
  })

  predictionTouchOverlay.addEventListener(event.CLICK_UP, (info) => {
    if (startX === null) return

    const duration = Date.now() - startTime

    if (!didSwipe && duration < 450) {
      const relativeX =
        info.x - getPredictionStartX() - predictionScrollOffset

      const stride =
        PREDICTION_ITEM_WIDTH + PREDICTION_ITEM_GAP

      const index = Math.floor(relativeX / stride)
      const positionInItem = relativeX - index * stride

      if (
        index >= 0 &&
        index < currentPredictions.length &&
        positionInItem >= 0 &&
        positionInItem < PREDICTION_ITEM_WIDTH
      ) {
        selectPrediction(currentPredictions[index])
      }
    }

    startX = null
    startTime = 0
    didSwipe = false
  })
}

function renderPredictions() {
  if (!predictionBar) return

  const bar = styles.prediction_bar
  const stride = PREDICTION_ITEM_WIDTH + PREDICTION_ITEM_GAP

  // Start at the beginning whenever the suggestions change.
  predictionScrollOffset = 0

  // Create a fixed pool of text widgets.
  // The transparent touch overlay must be above all of them.
  for (let i = 0; i < MAX_PREDICTIONS; i++) {
    const word = currentPredictions[i] || ''

    if (!predictionWidgets[i]) {
      predictionWidgets[i] = createWidget(widget.TEXT, {
        parent: predictionBar,
        x: bar.x + i * stride,
        y: bar.y,
        w: PREDICTION_ITEM_WIDTH,
        h: bar.h,
        text: word,
        text_size: px(22),
        color: 0xffffff,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
      })
    } else {
      predictionWidgets[i].setProperty(prop.TEXT, word)
    }

    predictionWidgets[i].setProperty(
      prop.VISIBLE,
      Boolean(word)
    )
  }

  if (!predictionTouchOverlay) {
    setupPredictionTouchHandlers()
  }

  updatePredictionWidgetPositions()
}



const MULTITAP_TIMEOUT = 800
const MULTITAP_SPEEDS = [
  { value: 200, label: getText("veryFast") },
  { value: 400, label: getText("fast") },
  { value: 600, label: getText("normal") },
  { value: 800, label: getText("slow") },
  { value: 1000, label: getText("verySlow") }
]

const letterWidgets = []

const ruRows = [
  [
    {
      label: '.,?!',
      chars: '.,?!',
      shiftLabel: '@₽-_',
      shiftChars: '@₽-_',
      longPress: '1'
    },
    {
      label: 'АБВГ',
      chars: 'абвг',
      longPress: '2'
    },
    {
      label: 'ДЕЖЗ',
      chars: 'дежз',
      longPress: '3'
    },
  ],
  [
    {
      label: 'ИЙКЛ',
      chars: 'ийкл',
      longPress: '4'
    },
    {
      label: 'МНОП',
      chars: 'мноп',
      longPress: '5'
    },
    {
      label: 'РСТУ',
      chars: 'рсту',
      longPress: '6'
    },
  ],
  [
    {
      label: 'ФХЦЧ',
      chars: 'фхцч',
      longPress: '7'
    },
    {
      label: 'ШЩЪЫ',
      chars: 'шщъы',
      longPress: '8'
    },
    {
      label: 'ЬЮЯЭ',
      chars: 'ьюяэ',
      longPress: '9'
    },
  ],
]

const enRows = [
  [
    {
      label: '.,?!',
      chars: '.,?!',
      shiftLabel: '@₽-_',
      shiftChars: '@₽-_',
      longPress: '1'
    },
    {
      label: 'ABC',
      chars: 'abc',
      longPress: '2'
    },
    {
      label: 'DEF',
      chars: 'def',
      longPress: '3'
    },
  ],
  [
    {
      label: 'GHI',
      chars: 'ghi',
      longPress: '4'
    },
    {
      label: 'JKL',
      chars: 'jkl',
      longPress: '5'
    },
    {
      label: 'MNO',
      chars: 'mno',
      longPress: '6'
    },
  ],
  [
    {
      label: 'PQRS',
      chars: 'pqrs',
      longPress: '7'
    },
    {
      label: 'TUV',
      chars: 'tuv',
      longPress: '8'
    },
    {
      label: 'WXYZ',
      chars: 'wxyz',
      longPress: '9'
    },
  ],
]


function getActiveRows() {
  return currentLanguage === "ru" ? ruRows : enRows
}


function updateKeyLabels() {
  const rows = getActiveRows()

  letterWidgets.forEach((item) => {
    const key = rows[item.rowIndex][item.keyIndex]

    const label =
      shiftEnabled &&
        !capsLockEnabled &&
        key.shiftLabel
        ? key.shiftLabel
        : key.label

    item.widget.setProperty(
      prop.TEXT,
      label
    )
  })
}

function addImagePressEffect(button, image) {
  button.addEventListener(event.CLICK_DOWN, () => {
    image.setAlpha(182)
  })

  button.addEventListener(event.CLICK_UP, () => {
    if (image === deleteImage && hideDeleteOnRelease) {
      image.setAlpha(0)
      hideDeleteOnRelease = false
    } else {
      image.setAlpha(255)
    }
  })
}


function addLetterPressEffect(button) {
  button.addEventListener(event.CLICK_DOWN, () => {
    button.setProperty(prop.MORE, {
      ...styles.keyButton,
      color: 0xb6b6b6,
    })
  })

  button.addEventListener(event.CLICK_UP, () => {
    button.setProperty(prop.MORE, {
      ...styles.keyButton,
      color: 0xffffff,
    })
  })
}


function updateInputState(
  hasText = keyboard.getTextContext().length > 0
) {
  actionImage.setProperty(
    prop.SRC,
    hasText
      ? "image/check.png"
      : "image/cancel.png"
  )

  deleteImage.setAlpha(hasText ? 255 : 0)
  deleteButton.setEnable(hasText)
}


function commitPendingChar() {
  if (!pendingChar) return

  keyboard.clearBuffer()
  keyboard.inputText(pendingChar)

  pendingChar = ""
  currentMultiTapKey = null
  currentMultiTapIndex = 0

  if (multiTapTimer) {
    clearTimeout(multiTapTimer)
    multiTapTimer = null
  }

  // One-shot Shift is consumed after commit.
  // Caps Lock remains active.
  if (shiftEnabled && !capsLockEnabled) {
    shiftEnabled = false

    shiftImage.setProperty(
      prop.SRC,
      "image/shift_off.png"
    )

    updateKeyLabels()
  }

  updateInputState()
}


DataWidget({
  state: {
    multiTapTimeout:
      localStorage.getItem('multiTapTimeout') ?? MULTITAP_TIMEOUT,
  },

  changeMultiTapTimeout() {
    const currentIndex = MULTITAP_SPEEDS.findIndex(
      speed => speed.value === this.state.multiTapTimeout
    )

    const nextSpeed =
      MULTITAP_SPEEDS[(currentIndex + 1) % MULTITAP_SPEEDS.length]

    this.state.multiTapTimeout = nextSpeed.value

    localStorage.setItem('multiTapTimeout', nextSpeed.value)

    showToast({
      content: `${getText("typingSpeed")}${nextSpeed.label}`,
    })
  },

  onInit() {
    Promise.all([
      ruT9Engine.init(),
      enT9Engine.init(),
    ]).then(() => {
      console.log('T9 engines ready')
    })
  },

  build() {
    // const background = createWidget(widget.CIRCLE, {
    //   center_x: 240,
    //   center_y: 240,
    //   radius: 240,
    //   color: 0xf00000
    // })
    predictionBar = null
    predictionWidgets = []
    predictionTouchOverlay = null
    predictionScrollOffset = 0
    // Main container
    const vc = createWidget(
      widget.VIRTUAL_CONTAINER,
      {
        ...styles.container,
      }
    )
    predictionBar = vc

    // Opaque TOP bar background keeps the input text behind it hidden.
    predictionBarBackground = createWidget(widget.FILL_RECT, {
      parent: vc,
      ...styles.prediction_bar,
      color: 0x000000,
    })

    // Single separator below the TOP bar, following Zepp's approach.
    predictionBarSeparator = createWidget(widget.STROKE_RECT, {
      parent: vc,
      x: styles.prediction_bar.x,
      y: styles.prediction_bar.y + styles.prediction_bar.h - 1,
      w: styles.prediction_bar.w,
      h: 1,
      line_width: 1,
      color: 0x505050,
    })
    // Container holding all keyboard rows
    const keyboardWidget = createWidget(
      widget.VIRTUAL_CONTAINER,
      {
        parent: vc,
        ...styles.keyboard,
      }
    )


    // DELETE

    deleteImage = createWidget(widget.IMG, {
      parent: vc,
      src: "image/delete.png",
      enable: false,
      ...styles.deleteKey,
    })

    deleteButton = createWidget(widget.BUTTON, {
      parent: vc,
      ...styles.deleteKey,

      click_func: () => {
        // If there is a pending multi-tap character,
        // delete it instead of committed text.
        if (pendingChar) {
          keyboard.clearBuffer()

          pendingChar = ""
          t9Sequence = ''
          updatePredictions()
          currentMultiTapKey = null
          currentMultiTapIndex = 0

          if (multiTapTimer) {
            clearTimeout(multiTapTimer)
            multiTapTimer = null
          }

          const hasText =
            keyboard.getTextContext().length > 0

          hideDeleteOnRelease = !hasText

          deleteButton.setEnable(hasText)

          return
        }

        const text = keyboard.getTextContext()

        hideDeleteOnRelease =
          text.length === 1

        keyboard.backspace(1)
        t9Sequence = ''
        updateInputState(
          text.length > 1
        )
        updatePredictions()
      },

      longpress_func: () => {
        keyboard.clearInput()
        updateInputState()
        t9Sequence = ''
        currentPredictions = []
        updatePredictions()
        vibrate()
      },
    })

    deleteButton.setAlpha(0)

    addImagePressEffect(
      deleteButton,
      deleteImage
    )


    // LETTER / MULTI-TAP ROWS

    getActiveRows().forEach(
      (row, rowIndex) => {

        const rowWidget = createWidget(
          widget.VIRTUAL_CONTAINER,
          {
            parent: keyboardWidget,
            ...styles.keyboardRow,
          }
        )

        row.forEach((key, keyIndex) => {
          let keyWidth =
            styles.keyButton.layout.width

          const letterWidget =
            createWidget(widget.BUTTON, {
              parent: rowWidget,
              ...styles.keyButton,

              layout: {
                ...styles.keyButton.layout,
                width: keyWidth,
              },

              text: key.label,

              click_func: () => {
                const activeKey =
                  getActiveRows()
                  [rowIndex]
                  [keyIndex]
                if (/^[2-9]$/.test(activeKey.longPress)) {
                  t9Sequence += activeKey.longPress
                }
                /*
                 * Shift symbols exist only on keys
                 * which define shiftChars.
                 *
                 * Caps Lock does NOT activate the
                 * symbols layer.
                 */
                const activeChars =
                  shiftEnabled &&
                    !capsLockEnabled &&
                    activeKey.shiftChars
                    ? activeKey.shiftChars
                    : activeKey.chars

                if (multiTapTimer) {
                  clearTimeout(
                    multiTapTimer
                  )
                  multiTapTimer = null
                }

                /*
                 * Same physical/logical key:
                 * cycle to the next character.
                 */
                if (
                  currentMultiTapKey ===
                  activeKey
                ) {
                  currentMultiTapIndex =
                    (
                      currentMultiTapIndex +
                      1
                    ) %
                    activeChars.length
                } else {
                  /*
                   * Different key:
                   * commit the previous character
                   * first.
                   */
                  commitPendingChar()

                  currentMultiTapKey =
                    activeKey

                  currentMultiTapIndex = 0
                }

                const char =
                  activeChars[
                  currentMultiTapIndex
                  ]

                /*
                 * Shift-symbol layer:
                 * use the symbol unchanged.
                 *
                 * Normal letter layer:
                 * apply Shift / Caps Lock case.
                 */
                if (
                  activeKey.shiftChars ===
                  activeChars
                ) {
                  pendingChar = char
                } else {
                  pendingChar =
                    (
                      shiftEnabled ||
                      capsLockEnabled
                    )
                      ? char.toUpperCase()
                      : char
                }

                /*
                 * Show only the current pending
                 * multi-tap character.
                 */
                keyboard.clearBuffer()
                keyboard.inputBuffer(
                  pendingChar
                )
                updatePredictions()
                deleteImage.setAlpha(255)
                deleteButton.setEnable(true)

                multiTapTimer =
                  setTimeout(() => {
                    commitPendingChar()
                  }, this.state.multiTapTimeout)
              },

              longpress_func: () => {
                const activeKey =
                  getActiveRows()
                  [rowIndex]
                  [keyIndex]

                /*
                 * Commit pending character first,
                 * then insert the digit.
                 */
                commitPendingChar()

                keyboard.inputText(
                  activeKey.longPress
                )

                updateInputState()
              },
            })

          addLetterPressEffect(
            letterWidget
          )

          /*
           * Store physical position rather than
           * the original key object.
           *
           * This allows the same widgets to use
           * either bgRows or enRows.
           */
          letterWidgets.push({
            widget: letterWidget,
            rowIndex,
            keyIndex,
          })
        })
      }
    )


    // ACTION ROW

    const actionRow = createWidget(
      widget.VIRTUAL_CONTAINER,
      {
        parent: keyboardWidget,

        layout: {
          ...styles.keyboardRow.layout,
        },
      }
    )


    const actionKeys = [
      // SHIFT
      {
        type: "shift",
        src: "image/shift_off.png",

        action: () => {
          if (capsLockEnabled) {
            capsLockEnabled = false
            shiftEnabled = false
          } else {
            shiftEnabled =
              !shiftEnabled
          }

          shiftImage.setProperty(
            prop.SRC,
            shiftEnabled
              ? "image/shift_on.png"
              : "image/shift_off.png"
          )

          /*
           * Normal:
           *   .,?!
           *
           * One-shot Shift:
           *   @€-_
           *
           * Caps Lock:
           *   .,?!
           */
          updateKeyLabels()
          vibrate()
        },

        longpress_func: () => {
          capsLockEnabled =
            !capsLockEnabled

          shiftEnabled = false

          shiftImage.setProperty(
            prop.SRC,
            capsLockEnabled
              ? "image/shift_on_caps.png"
              : "image/shift_off.png"
          )

          updateKeyLabels()
          vibrate()
        },
      },


      // LANGUAGE / INPUT METHOD
      {
        type: "globe",
        src: "image/globe.png",

        action: () => {
          /*
           * Finish the current character before
           * changing its mapping.
           */
          commitPendingChar()

          currentLanguage =
            currentLanguage === "ru"
              ? "en"
              : "ru"

          updateKeyLabels()
          vibrate()
          t9Sequence = ''
          currentPredictions = []
          updatePredictions()
        },

        longpress_func: () => {
          /*
           * Keep the Zepp OS input-method
           * selector on long press.
           */
          keyboard.sendFnKey(
            keyboard.SELECT
          )
        },
      },


      // SPACE / 0
      {
        src: "image/blank.png",

        action: () => {
          if (pendingChar) {
            commitPendingChar()
          }
          keyboard.inputText(" ")
          t9Sequence = ''
          currentPredictions = []
          updatePredictions()
          updateInputState()
        },

        longpress_func: () => {
          /*
           * Otherwise 0 could be inserted before
           * an active pending character.
           */
          commitPendingChar()

          keyboard.inputText("0")
          updateInputState()
        },
      },


      // ENTER / CANCEL
      {
        type: "enter",
        src: "image/check.png",

        action: () => {
          if (keyboard.getTextContext()) {
            keyboard.sendFnKey(
              keyboard.ENTER
            )
          } else {
            keyboard.sendFnKey(
              keyboard.CANCEL
            )
          }
        },
        longpress_func: () => {
          this.changeMultiTapTimeout()
          vibrate()
        }
      },
    ]


    actionKeys.forEach((key) => {
      const keyContainer =
        createWidget(
          widget.VIRTUAL_CONTAINER,
          {
            parent: actionRow,
            ...styles.actionKeyContainer,
          }
        )

      const img = createWidget(
        widget.IMG,
        {
          parent: keyContainer,
          src: key.src,
          enable: false,
          ...styles.actionImage,
        }
      )

      const btn = createWidget(
        widget.BUTTON,
        {
          parent: keyContainer,
          ...styles.overlayButton,
          click_func: key.action,
          longpress_func:
            key.longpress_func,
        }
      )

      btn.setAlpha(0)

      addImagePressEffect(
        btn,
        img
      )

      if (key.type === "shift") {
        shiftImage = img
      }

      if (key.type === "globe") {
        globeImage = img
      }

      if (key.type === "enter") {
        actionImage = img
      }
    })
    // enable full shift behaviour on start
    shiftImage.setProperty(
      prop.SRC,
      shiftEnabled
        ? "image/shift_on.png"
        : "image/shift_off.png"
    )

    updateKeyLabels()
  },


  onResume() {
    // Restore globe image after returning
    // from the system input selector.
    if (globeImage) {
      globeImage.setAlpha(255)
    }

    updateInputState()
  },


  onDestroy() {
    console.log(
      'RU keyboard: onDestroy'
    )
  },
})