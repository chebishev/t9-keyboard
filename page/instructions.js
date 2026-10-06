import {
    createWidget,
    widget,
    text_style,
    align,
} from '@zos/ui'
import { getDeviceInfo } from '@zos/device'

const { width: DEVICE_WIDTH } = getDeviceInfo()
const deviceInfo = getDeviceInfo();

function defaultTheme() {
    if (deviceInfo.screenShape === SCREEN_SHAPE_SQUARE) {
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
            x: 80,
            y: 20,
            w: DEVICE_WIDTH - 160,
            h: 45,
            text: "HOW TO USE",
            text_size: 24,
            color: 0xffffff,
            align_h: align.CENTER_H,
            text_style: text_style.NONE,
        })


        // SHIFT
        createWidget(widget.IMG, {
            x: 58,
            y: 80,
            w: 48,
            h: 48,
            src: "image/shift_off.png",
        })

        createWidget(widget.TEXT, {
            x: 125,
            y: 74,
            w: 290,
            h: 65,
            text: "Tap — Shift / symbols\nHold — Caps Lock",
            text_size: 20,
            color: 0xffffff,
            text_style: text_style.WRAP,
        })


        // NUMBERS 1–9
        createWidget(widget.TEXT, {
            x: 55,
            y: 158,
            w: 60,
            h: 42,
            text: "1–9",
            text_size: 22,
            color: 0xffffff,
            align_h: align.CENTER_H,
        })

        createWidget(widget.TEXT, {
            x: 125,
            y: 154,
            w: 290,
            h: 50,
            text: "Hold key — Type number",
            text_size: 20,
            color: 0xffffff,
        })


        // SPACE / 0
        createWidget(widget.IMG, {
            x: 55,
            y: 222,
            w: 56,
            h: 56,
            src: "image/blank.png",
        })

        createWidget(widget.TEXT, {
            x: 125,
            y: 224,
            w: 290,
            h: 50,
            text: "Hold — Type 0",
            text_size: 20,
            color: 0xffffff,
        })


        // GLOBE
        createWidget(widget.IMG, {
            x: 58,
            y: 300,
            w: 48,
            h: 54,
            src: "image/globe.png",
        })

        createWidget(widget.TEXT, {
            x: 125,
            y: 294,
            w: 290,
            h: 65,
            text: "Tap — Bulgarian / English\nHold — More keyboards",
            text_size: 20,
            color: 0xffffff,
            text_style: text_style.WRAP,
        })


        // MULTI-TAP
        createWidget(widget.TEXT, {
            x: 90,
            y: 382,
            w: 300,
            h: 60,
            text: "Tap repeatedly to cycle letters",
            text_size: 18,
            color: 0xb6b6b6,
            align_h: align.CENTER_H,
            text_style: text_style.WRAP,
        })
    }
})