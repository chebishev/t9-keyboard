import { keyboard, align } from '@zos/ui';
import { getDeviceInfo } from '@zos/device';
import { px } from '@zos/utils';

export const { h } = keyboard.getContentRect();
export const { width: DEVICE_WIDTH } = getDeviceInfo();
const keyboardButtonColor = 0x000000;

export const styles = {
    container: {
        layout: {
            display: "flex",
            flex_flow: "column wrap",
            justify_content: "start",
            align_items: "center",
            align_content: "center",
            top: h + "",
            width: "100vw",
            height: "100vh",
        },
    },

    keyboard: {
        layout: {
            display: "flex",
            flex_flow: "column",
            gap: "2",
            width: "100%",
            flex_grow: "1",
        },
    },

    keyboardRow: {
        layout: {
            display: "flex",
            flex_flow: "row wrap",
            justify_content: "center",
            align_items: "center",
            align_content: "center",
            width: "100%",
            height: "16vh",
            column_gap: "2",
        },
    },

    keyButton: {
        radius: 10,
        normal_color: keyboardButtonColor,
        press_color: keyboardButtonColor,
        layout: {
            height: "100%",
            width: "32%",
            font_size: "36",
        },
    },

    deleteKey: {
        x: DEVICE_WIDTH - px(100),
        y: h - px(48),
        w: 64,
        h: 64,
    },

    overlayButton: {
        layout: {
            width: "100%",
            height: "100%",
            tags: "ignore-layout",
        },
    },

    actionKeyContainer: {
        layout: {
            width: "13%",
            height: "100%",
            display: "flex",
            justify_content: "center",
            align_items: "center",
            align_content: "center",
        },
    },

    actionImage: {
        layout: {
            width: "64",
            height: "64",
        },
    },
    prediction_bar: {
        x: 0,
        y: 0,
        w: DEVICE_WIDTH,
        h: px(41),
    },

    // Prediction item geometry and appearance.
    predictionItemWidth: px(85),
    predictionItemGap: px(8),

    predictionText: {
        text_size: px(22),
        color: 0xffffff,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
    },

    predictionTouchOverlay: {
        alpha: 0,
    },

    predictionBarBackground: {
        color: 0x000000,
    },

    predictionBarSeparator: {
        h: 1,
        line_width: 1,
        color: 0x505050,
    },

    // Letter key press feedback.
    keyButtonPressed: {
        color: 0xb6b6b6,
    },

    keyButtonReleased: {
        color: 0xffffff,
    },
}