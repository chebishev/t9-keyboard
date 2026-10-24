// Zepp OS APIs
import { getDeviceInfo } from '@zos/device'
import { getText } from '@zos/i18n'
import { showToast } from '@zos/interaction'
import { Vibrator } from '@zos/sensor'
import { LocalStorage } from '@zos/storage'
import {
  createWidget,
  event,
  keyboard,
  prop,
  widget,
} from '@zos/ui'

// Layout
import { styles } from 'zosLoader:./index.[pf].layout.js'

// Application modules
import { T9Engine, BASE_LANG } from './engine/t9-engine'
import { enRows, nativeRows } from './keyboard-keys'

// ========================================
// DEVICE AND SERVICES
// ========================================

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()
const IS_ROUND = DEVICE_WIDTH === DEVICE_HEIGHT

const localStorage = new LocalStorage()
const vibro = new Vibrator()


// ========================================
// CONFIGURATION
// ========================================


// Multi-tap
const MULTITAP_TIMEOUT = 800

const MULTITAP_SPEEDS = [
  { value: 200, label: getText('veryFast') },
  { value: 400, label: getText('fast') },
  { value: 600, label: getText('normal') },
  { value: 800, label: getText('slow') },
  { value: 1000, label: getText('verySlow') },
]

// Predictions
const MAX_PREDICTIONS = 5
const PREDICTION_ITEM_WIDTH = styles.predictionItemWidth
const PREDICTION_ITEM_GAP = styles.predictionItemGap
const MAX_USER_WORDS = 500
const CLEANUP_INTERVAL = 3 * 24 * 60 * 60 * 1000
const LAST_CLEANUP_KEY = 'dictCleanup'
const WORD_SEPARATORS = new Set([' ', ',', '!', '?'])

// ========================================
// USER DICTIONARY
// ========================================

const NATIVE_DICT_KEY = 'nativeDict'
const EN_DICT_KEY = 'enDict'

function loadUserDictionary(storageKey) {
  const stored = localStorage.getItem(storageKey)

  if (
    !stored ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return {}
  }

  return stored
}

const nativeUserDict = loadUserDictionary(NATIVE_DICT_KEY)
const enUserDict = loadUserDictionary(EN_DICT_KEY)

function saveUserDictionary(language) {
  const isNative = language === BASE_LANG
  const key = isNative ? NATIVE_DICT_KEY : EN_DICT_KEY
  const dictionary = isNative ? nativeUserDict : enUserDict

  localStorage.setItem(key, dictionary)
}

function pruneDictionary(dictionary) {
  const words = Object.keys(dictionary)
  const excess = words.length - MAX_USER_WORDS

  if (excess <= 0) return false

  words.sort((a, b) => {
    const usageDiff =
      (dictionary[a].usageCount || 0) -
      (dictionary[b].usageCount || 0)

    if (usageDiff !== 0) return usageDiff

    return (dictionary[a].lastUsed || 0) -
      (dictionary[b].lastUsed || 0)
  })

  for (let i = 0; i < excess; i++) {
    delete dictionary[words[i]]
  }

  return true
}


function recordWordUsage(word, language = currentLanguage) {
  const normalizedWord = word.toLowerCase()

  if (!normalizedWord) return

  const isNative = language === BASE_LANG
  const dictionary = isNative ? nativeUserDict : enUserDict
  const engine = isNative ? nativeT9Engine : enT9Engine
  const lettersOnly = normalizedWord.replace(/[-']/g, '')

  if (
    !lettersOnly ||
    /^[-']|[-']$|[-']{2,}/.test(normalizedWord) ||
    engine.wordToSeq(lettersOnly).length !== lettersOnly.length
  ) {
    return
  }

  const previous = dictionary[normalizedWord]

  dictionary[normalizedWord] = {
    usageCount: (previous?.usageCount ?? 0) + 1,
    lastUsed: Date.now(),
  }

  saveUserDictionary(language)
}

function getTrailingWord(text) {
  if (!text) return ''

  // Ignore sentence-ending periods.
  text = text.replace(/\.+$/, '')

  if (!text) return ''

  let start = text.length - 1

  if (WORD_SEPARATORS.has(text[start])) {
    return ''
  }

  while (
    start >= 0 &&
    !WORD_SEPARATORS.has(text[start])
  ) {
    start--
  }

  return text.slice(start + 1)
}

function recordTrailingWord(separator = '') {
  let text = keyboard.getTextContext() || ''

  if (separator && text.endsWith(separator)) {
    text = text.slice(0, -separator.length)
  }

  const word = getTrailingWord(text)

  if (word) {
    recordWordUsage(word, currentLanguage)
  }
}

// ========================================
// KEYBOARD STATE
// ========================================

// Language and character case
let currentLanguage = BASE_LANG
let shiftEnabled = true
let capsLockEnabled = false

// Multi-tap
let currentMultiTapKey = null
let currentMultiTapIndex = 0
let multiTapTimer = null
let pendingChar = ''

// T9
let t9Sequence = ''
let t9WordShiftEnabled = false
let currentPredictions = []
const enT9Engine = new T9Engine(
  Object.keys(enUserDict),
  'en'
)

const nativeT9Engine = new T9Engine(
  Object.keys(nativeUserDict),
  BASE_LANG
)

// Keyboard widgets
let shiftImage = null
let deleteImage = null
let deleteButton = null
let globeImage = null
let actionImage = null
let hideDeleteOnRelease = false
const letterWidgets = []

// Prediction widgets
let predictionBar = null
let predictionWidgets = []
let predictionBarSeparator = null
let predictionTouchOverlay = null
let predictionScrollOffset = 0

function vibrate() {
  vibro.setMode(27)
  vibro.start()
}

function getActiveT9Engine() {
  return currentLanguage === BASE_LANG ? nativeT9Engine : enT9Engine
}

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

function formatPrediction(word, isShift, isCapsLock) {
  if (isCapsLock) {
    return word.toUpperCase()
  }

  if (isShift) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }

  return word
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

  const prediction = formatPrediction(
    word,
    t9Sequence ? t9WordShiftEnabled : shiftEnabled,
    capsLockEnabled
  )


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
  keyboard.inputText(prediction + ' ')
  // Save/update the word in localStorage (word, usage_count, last_time_used)
  recordWordUsage(prediction, currentLanguage)
  // Reset prediction state for the next word.
  t9Sequence = ''
  t9WordShiftEnabled = false
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
    : styles.prediction_bar.x + styles.predictionItemInset
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
    ...styles.predictionTouchOverlay,
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
    const word = formatPrediction(
      currentPredictions[i] || '',
      t9Sequence ? t9WordShiftEnabled : shiftEnabled,
      capsLockEnabled
    )

    if (!predictionWidgets[i]) {
      predictionWidgets[i] = createWidget(widget.TEXT, {
        parent: predictionBar,
        x: bar.x + i * stride,
        y: bar.y,
        w: PREDICTION_ITEM_WIDTH,
        h: bar.h,
        text: word,
        ...styles.predictionText,
      })
    } else {
      predictionWidgets[i].setProperty(prop.TEXT, word)
    }

    predictionWidgets[i].setProperty(
      prop.VISIBLE,
      Boolean(word)
    )
  }

  if (predictionBarSeparator) {
    predictionBarSeparator.setProperty(
      prop.VISIBLE,
      currentPredictions.length > 0
    )
  }

  if (!predictionTouchOverlay) {
    setupPredictionTouchHandlers()
  }

  updatePredictionWidgetPositions()
}

function getActiveRows() {
  return currentLanguage === BASE_LANG ? nativeRows : enRows
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
      ...styles.keyButtonPressed,
    })
  })

  button.addEventListener(event.CLICK_UP, () => {
    button.setProperty(prop.MORE, {
      ...styles.keyButton,
      ...styles.keyButtonReleased,
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

  const committedChar = pendingChar

  if (WORD_SEPARATORS.has(committedChar)) {
    recordTrailingWord(committedChar)
  }

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
      nativeT9Engine.init(),
      enT9Engine.init(),
    ]).then(() => {
      console.log('T9 engines ready')
    })
  },

  build() {
    predictionBar = null
    predictionWidgets = []
    predictionBarSeparator = null
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
    createWidget(widget.FILL_RECT, {
      parent: vc,
      ...styles.prediction_bar,
      ...styles.predictionBarBackground,
    })

    // Single separator below the TOP bar, following Zepp's approach.
    predictionBarSeparator = createWidget(widget.STROKE_RECT, {
      parent: vc,
      ...styles.predictionBarSeparator,
      x: styles.prediction_bar.x,
      y:
        styles.prediction_bar.y +
        styles.prediction_bar.h -
        styles.predictionBarSeparator.h,
      w: styles.prediction_bar.w,
    })
    predictionBarSeparator.setProperty(prop.VISIBLE, false)

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
          t9Sequence = t9Sequence.slice(0, -1)
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
        t9Sequence = t9Sequence.slice(0, -1)
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

                const isShiftSymbolLayer =
                  activeKey.shiftChars === activeChars

                const useUppercase =
                  !isShiftSymbolLayer &&
                  (shiftEnabled || capsLockEnabled)

                let charsToCycle = activeChars

                if (useUppercase) {
                  charsToCycle = []

                  for (let i = 0; i < activeChars.length; i++) {
                    const char = activeChars[i].toUpperCase()

                    if (charsToCycle.indexOf(char) === -1) {
                      charsToCycle.push(char)
                    }
                  }
                }
                
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
                    ) % charsToCycle.length
                } else {
                  /*
                   * Different key:
                   * commit the previous character
                   * first.
                   */
                  if (
                    !t9Sequence &&
                    /^[2-9]$/.test(activeKey.longPress)
                  ) {
                    t9WordShiftEnabled = shiftEnabled
                  }

                  commitPendingChar()

                  if (/^[2-9]$/.test(activeKey.longPress)) {
                    t9Sequence += activeKey.longPress
                  }

                  currentMultiTapKey =
                    activeKey

                  currentMultiTapIndex = 0
                }

                const char = charsToCycle[currentMultiTapIndex]
                pendingChar = char

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
            currentLanguage === BASE_LANG
              ? "en"
              : BASE_LANG

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
          recordTrailingWord()
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
          commitPendingChar()

          const text = keyboard.getTextContext() || ''

          if (text) {
            recordTrailingWord()

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
    const now = Date.now()
    const lastCleanup =
      localStorage.getItem(LAST_CLEANUP_KEY) || 0

    if (now - lastCleanup >= CLEANUP_INTERVAL) {
      if (pruneDictionary(nativeUserDict)) {
        saveUserDictionary(BASE_LANG)
      }

      if (pruneDictionary(enUserDict)) {
        saveUserDictionary('en')
      }

      localStorage.setItem(LAST_CLEANUP_KEY, now)
    }

    console.log('T9 keyboard: onDestroy')
  },
})