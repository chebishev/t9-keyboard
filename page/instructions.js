import {
    createWidget,
    widget,
    text_style,
    align,
    setStatusBarVisible
} from '@zos/ui'
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from '@zos/device'

const { width: DEVICE_WIDTH, screenShape } = getDeviceInfo()
const widgetImageX = 40
const widgetTextX = 120
const widgetTextW = 290
const widgetTextSize = 20
const widgetTextColor = 0xffffff

function defaultTheme() {
    if (screenShape === SCREEN_SHAPE_SQUARE) {
        setStatusBarVisible(false);
    }
}

Page({
    onInit() {
        defaultTheme();
    },

    build() {
        // Title
        createWidget(widget.TEXT, {
            x: 0,
            y: 25,
            w: DEVICE_WIDTH,
            h: 45,
            text: "HOW TO USE",
            text_size: widgetTextSize + 4,
            color: widgetTextColor,
            align_h: align.CENTER_H,
            text_style: text_style.NONE
        })


        // SHIFT
        createWidget(widget.IMG, {
            x: widgetImageX,
            y: 70,
            w: 48,
            h: 48,
            src: "image/shift_off.png",
        })

        createWidget(widget.TEXT, {
            x: widgetTextX,
            y: 74,
            w: widgetTextW,
            h: 65,
            text: "Tap — Shift / symbols\nHold — Caps Lock",
            text_size: widgetTextSize,
            color: widgetTextColor,
            text_style: text_style.WRAP,
        })


        // NUMBERS 1–9
        createWidget(widget.TEXT, {
            x: widgetImageX,
            y: 145,
            w: 60,
            h: 42,
            text: "1–9",
            text_size: widgetTextSize + 4,
            color: widgetTextColor,
            align_h: align.CENTER_H,
        })

        createWidget(widget.TEXT, {
            x: widgetTextX,
            y: 147,
            w: widgetTextW,
            h: 54,
            text: "Hold key — Type number",
            text_size: widgetTextSize,
            color: widgetTextColor,
        })


        // SPACE / 0
        createWidget(widget.IMG, {
            x: widgetImageX,
            y: 170,
            w: 56,
            h: 56,
            src: "image/blank.png",
        })

        createWidget(widget.TEXT, {
            x: widgetTextX,
            y: 200,
            w: widgetTextW,
            h: 50,
            text: "Hold — Type 0",
            text_size: widgetTextSize,
            color: widgetTextColor,
        })


        // GLOBE
        createWidget(widget.IMG, {
            x: widgetImageX,
            y: 239,
            w: 48,
            h: 54,
            src: "image/globe.png",
        })

        createWidget(widget.TEXT, {
            x: widgetTextX,
            y: 245,
            w: widgetTextW,
            h: 65,
            text: "Tap — Bulgarian / English\nHold — More keyboards",
            text_size: widgetTextSize,
            color: widgetTextColor,
            text_style: text_style.WRAP,
        })

        // Enter/Cancel
        createWidget(widget.IMG, {
            x: 15,
            y: 310,
            w: 48,
            h: 54,
            src: "image/cancel.png",
        })
        createWidget(widget.IMG, {
            x: 50,
            y: 310,
            w: 48,
            h: 54,
            src: "image/check.png",
        })

        createWidget(widget.TEXT, {
            x: widgetTextX,
            y: 315,
            w: widgetTextW,
            h: 60,
            text: "Hold — change\ntyping speed",
            text_size: widgetTextSize,
            color: widgetTextColor,
        })

        // MULTI-TAP
        createWidget(widget.TEXT, {
            x: 0,
            y: 395,
            w: DEVICE_WIDTH,
            h: 60,
            text: "Tap repeatedly to cycle letters",
            text_size: widgetTextSize - 2,
            color: 0xb6b6b6,
            align_h: align.CENTER_H,
            text_style: text_style.WRAP,
        })
    }
})