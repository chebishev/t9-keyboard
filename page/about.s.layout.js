import { setStatusBarVisible } from "@zos/ui"
import { px } from "@zos/utils"

import {
    APP_INFO as BASE_APP_INFO,
    CREATOR_INFO as BASE_CREATOR_INFO,
    QRCODE as BASE_QRCODE
} from "./about.layout"

setStatusBarVisible(false)

export const APP_INFO = BASE_APP_INFO

export const CREATOR_INFO = {
    ...BASE_CREATOR_INFO,
    y: px(160),
    h: px(80)
}

export const QRCODE = {
    ...BASE_QRCODE,
    y: px(290),
    bg_y: px(270)
}