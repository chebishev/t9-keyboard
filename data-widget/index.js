import {
  createWidget,
  widget,
  keyboard,
  prop,
  event
} from '@zos/ui'
import { showToast } from "@zos/interaction";
import { styles } from "zosLoader:./index.[pf].layout.js"
import { LocalStorage } from "@zos/storage";

const localStorage = new LocalStorage()

let shiftEnabled = false
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

let currentLanguage = "ru"

const MULTITAP_TIMEOUT = 800
const MULTITAP_SPEEDS = [
  { value: 200, label: "Очень быстро" },
  { value: 400, label: "Быстро" },
  { value: 600, label: "Нормально" },
  { value: 800, label: "Медленно" },
  { value: 1000, label: "Очень медленно" }
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
    content: `Скорость ввода:\n${nextSpeed.label}`,
  })
},

  build() {

    // Main container
    const vc = createWidget(
      widget.VIRTUAL_CONTAINER,
      {
        ...styles.container,
      }
    )

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

        updateInputState(
          text.length > 1
        )
      },

      longpress_func: () => {
        keyboard.clearInput()
        updateInputState()
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

      if (key.type === "globe") {
        globeImage = img
      }

      if (key.type === "enter") {
        actionImage = img
      }

      if (key.type === "shift") {
        shiftImage = img
      }
    })
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