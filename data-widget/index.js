import {
  createWidget,
  widget,
  keyboard,
  prop,
  event,
} from '@zos/ui'
import { styles } from "zosLoader:./index.[pf].layout.js"

let shiftEnabled = false
let capsLockEnabled = false
let shiftImage = null;
let deleteImage = null;
let deleteButton = null;
let globeImage = null;
let actionImage = null;
let hideDeleteOnRelease = false
let currentMultiTapKey = null
let currentMultiTapIndex = 0
let multiTapTimer = null

const MULTITAP_TIMEOUT = 800
const letterWidgets = [];

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

function updateInputState(hasText = keyboard.getTextContext().length > 0) {
  actionImage.setProperty(
    prop.SRC,
    hasText ? "image/check.png" : "image/cancel.png"
  )

  deleteImage.setAlpha(hasText ? 255 : 0)
  deleteButton.setEnable(hasText)
}

DataWidget({
  onInit() {
    console.log("INIT")
  },
  build() {
    console.log("BUILD")
    // const background = createWidget(widget.CIRCLE, {
    //   center_x: 240,
    //   center_y: 240,
    //   radius: 240,
    //   color: 0xa0a0a0,
    // })
    // Main container
    const vc = createWidget(widget.VIRTUAL_CONTAINER, {
      ...styles.container,
    })

    // Container holding all keyboard rows
    const keyboardWidget = createWidget(widget.VIRTUAL_CONTAINER, {
      parent: vc,
      ...styles.keyboard,
    })

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
        const text = keyboard.getTextContext()

        hideDeleteOnRelease = text.length === 1

        keyboard.backspace(1)

        updateInputState(text.length > 1)
      },

      longpress_func: () => {
        keyboard.clearInput()
        updateInputState()
      },
    })

    deleteButton.setAlpha(0)

    addImagePressEffect(deleteButton, deleteImage)

    const rows = [
      [
        { label: '.,?!', chars: '.,?!', longPress: '1' },
        { label: 'АБВГ', chars: 'абвг', longPress: '2' },
        { label: 'ДЕЖЗ', chars: 'дежз', longPress: '3' },
      ],
      [
        { label: 'ИЙКЛ', chars: 'ийкл', longPress: '4' },
        { label: 'МНОП', chars: 'мноп', longPress: '5' },
        { label: 'РСТУ', chars: 'рсту', longPress: '6' },
      ],
      [
        { label: 'ФХЦЧ', chars: 'фхцч', longPress: '7' },
        { label: 'ШЩЪ', chars: 'шщъ', longPress: '8' },
        { label: 'ЬЮЯ', chars: 'ьюя', longPress: '9' },
      ],
    ]

    rows.forEach((row) => {
      // Each array becomes its own flex row
      const rowWidget = createWidget(widget.VIRTUAL_CONTAINER, {
        parent: keyboardWidget,
        ...styles.keyboardRow,
      })

      row.forEach((key) => {
        let keyWidth = styles.keyButton.layout.width

        const letterWidget = createWidget(widget.BUTTON, {
          parent: rowWidget,
          ...styles.keyButton,
          layout: {
            ...styles.keyButton.layout,
            width: keyWidth,
          },

          text: key.label,

          click_func: () => {
            if (currentMultiTapKey === key) {
    currentMultiTapIndex =
      (currentMultiTapIndex + 1) % key.chars.length
  } else {
    currentMultiTapKey = key
    currentMultiTapIndex = 0
  }

  keyboard.clearBuffer()

  keyboard.inputBuffer(
    key.chars[currentMultiTapIndex]
  )
          },
          longpress_func: () => {
            keyboard.inputText(key.longPress)
            updateInputState()
          }
        })

        addLetterPressEffect(letterWidget)

        letterWidgets.push({
          widget: letterWidget,
          letter: key,
        })
      })
    })
    const actionRow = createWidget(widget.VIRTUAL_CONTAINER, {
      parent: keyboardWidget,
      layout: {
        ...styles.keyboardRow.layout,
      },
    })
    // shift, switch T9 EN/BG, space, enter/cancel
    const actionKeys = [
      {
        type: "shift",
        src: "image/shift_off.png",
        action: () => {
          if (capsLockEnabled) {
            capsLockEnabled = false
            shiftEnabled = false
          } else {
            shiftEnabled = !shiftEnabled
          }

          shiftImage.setProperty(
            prop.SRC,
            shiftEnabled
              ? "image/shift_on.png"
              : "image/shift_off.png"
          )
        },

        longpress_func: () => {
          capsLockEnabled = !capsLockEnabled
          shiftEnabled = false

          shiftImage.setProperty(
            prop.SRC,
            capsLockEnabled
              ? "image/shift_on_caps.png"
              : "image/shift_off.png"
          )
        },
      },
      {
        type: "globe",
        src: "image/globe.png",
        action: () => {
          // change language
          keyboard.sendFnKey(keyboard.SWITCH)
        },
        longpress_func: () => {
          // open additional input methods and settings
          keyboard.sendFnKey(keyboard.SELECT)
        },
      },
      {
        src: "image/blank.png", action: () => {
          // add empty space to the text
          keyboard.inputText(" ")
          updateInputState()
        },
        longpress_func: () => {
          keyboard.inputText("0")
          updateInputState()
        }

      },
      {
        type: "enter",
        src: "image/check.png",
        action: () => {
          if (keyboard.getTextContext()) {
            // send the text to wherever is needed
            keyboard.sendFnKey(keyboard.ENTER)
          } else {
            // close the keyboard
            keyboard.sendFnKey(keyboard.CANCEL)
          }
        }
      },
    ]

    actionKeys.forEach((key) => {
      const keyContainer = createWidget(widget.VIRTUAL_CONTAINER, {
        parent: actionRow,
        ...styles.actionKeyContainer,
      })

      const img = createWidget(widget.IMG, {
        parent: keyContainer,
        src: key.src,
        enable: false,
        ...styles.actionImage,
      })

      const btn = createWidget(widget.BUTTON, {
        parent: keyContainer,
        ...styles.overlayButton,
        click_func: key.action,
        longpress_func: key.longpress_func,
      })

      btn.setAlpha(0)

      addImagePressEffect(btn, img)

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
    // revert swich input image to original state
    if (globeImage) {
      globeImage.setAlpha(255)
    }

    updateInputState()
  },

  onDestroy() {
    console.log('BG keyboard: onDestroy')
  },
})