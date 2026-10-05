import { getText } from "@zos/i18n"
import { align, text_style } from "@zos/ui"
import { px } from "@zos/utils"

export const APP_INFO = {
    x: px(96),
    y: px(60),
    w: px(288),
    h: px(50),
    color: 0xffffff,
    text_size: px(22),
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    text_style: text_style.WRAP,
    text: `${getText("appName")}\n${getText("version")}`
}

export const CREATOR_INFO = {
    x: px(96),
    y: px(130),
    w: px(288),
    h: px(48),
    color: 0xffffff,
    text_size: px(19),
    align_h: align.CENTER_H,
    align_v: align.CENTER_V,
    text_style: text_style.WRAP,
    text: `${getText("creator")}\n${getText("email")}`
}

export const QRCODE = {
    content: getText("link"),
    x: px(140),
    y: px(210),
    w: px(200),
    h: px(200),
    bg_x: px(120),
    bg_y: px(190),
    bg_w: px(240),
    bg_h: px(240)
}