import {
    createWidget,
    widget,
    text_style,
    align,
    setStatusBarVisible
} from '@zos/ui'
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from '@zos/device'

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
            y: 25,
            w: DEVICE_WIDTH - 160,
            h: 45,
            text: "КАК ПОЛЬЗОВАТЬСЯ",
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
            text: "Нажатие — Shift / символы\nУдержание — Caps Lock",
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
            h: 54,
            text: "Удержание клавиши:\nввод цифры",
            text_size: 20,
            color: 0xffffff,
        })


        // SPACE / 0
        createWidget(widget.IMG, {
            x: 55,
            y: 212,
            w: 56,
            h: 56,
            src: "image/blank.png",
        })

        createWidget(widget.TEXT, {
            x: 125,
            y: 240,
            w: 290,
            h: 50,
            text: "Удержание — ввод 0",
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
            y: 300,
            w: 290,
            h: 65,
            text: "Нажатие — русский / английский\nУдержание — другие клавиатуры",
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
            text: "Нажимайте несколько раз для выбора буквы",
            text_size: 18,
            color: 0xb6b6b6,
            align_h: align.CENTER_H,
            text_style: text_style.WRAP,
        })
    }
})