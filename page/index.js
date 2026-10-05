
import {
  keyboard,
  createWidget,
  widget,
  createKeyboard,
  deleteKeyboard,
  align,
  text_style,
  deleteWidget,
  updateLayout,
  setStatusBarVisible,
} from "@zos/ui";

import { px } from "@zos/utils";
import { showToast } from "@zos/interaction";
import { scrollTo } from "@zos/page";
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from "@zos/device";
import { exit, launchApp, push } from "@zos/router";
import { getPackageInfo } from "@zos/app";


const deviceInfo = getDeviceInfo();
const appName = getPackageInfo().name;


function keyboardIsEnabled() {
  if (keyboard.isEnabled) {
    return keyboard.isEnabled();
  }

  return true;
}


function keyboardIsSelected() {
  if (keyboard.isSelected) {
    return keyboard.isSelected();
  }

  return true;
}


function keyboardGotoSettings() {
  if (keyboard.gotoSettings) {
    return keyboard.gotoSettings();
  }

  launchApp({
    url: "Settings_keyboardScreen",
    native: true,
  });
}


function defaultTheme() {
  if (deviceInfo.screenShape === SCREEN_SHAPE_SQUARE) {
    setStatusBarVisible(false);
  }
}


const defaultTextStyle = {
  color: 0xffffff,
  align_v: align.CENTER_V,
  align_h: align.CENTER_H,
  text_style: text_style.CHAR_WRAP,
};

const menuButtonColor = 0x0c86d1;

const menuButtonLayout = {
  width: "100%",
  height: px(88),
  font_size: px(36),
  corner_radius: px(44),
};

const pageLayout = {
  left: "0",
  top: "0",
  width: "100vw",
  height: "100vh",
  display: "flex",
  flex_flow: "column",
  row_gap: px(25),
  padding_top: px(40),
  padding_left: px(72),
  padding_right: px(72),
};


function createPageContainer() {
  return createWidget(widget.VIRTUAL_CONTAINER, {
    layout: {
      ...pageLayout,
    },
  });
}


function createMenuButton(parent, text, clickFunc) {
  return createWidget(widget.BUTTON, {
    parent,
    text,
    normal_color: menuButtonColor,
    press_color: menuButtonColor,
    click_func: clickFunc,
    layout: {
      ...menuButtonLayout,
    },
  });
}


function createBottomSpacer(parent) {
  return createWidget(widget.FILL_RECT, {
    parent,
    layout: {
      width: "100%",
      height: px(100),
    },
  });
}


function createAboutButton(parent) {
  return createMenuButton(parent, "About", () => {
    push({
      url: "page/about",
    });
  });
}


/*
 * VIRTUAL_CONTAINER keeps its children as layout children, so preserve
 * the recursive cleanup behavior from the original Zepp sample.
 */
function removeElement(element) {
  if (element.getType() === widget.VIRTUAL_CONTAINER) {
    const children = element.layoutChildren;

    deleteWidget(element);

    children.forEach((item) => {
      removeElement(item);
    });
  } else {
    deleteWidget(element);
  }
}


Page({
  state: {
    isEnabled: keyboardIsEnabled(),
    isSelected: keyboardIsSelected(),
    vc: null,
  },


  onInit() {
    defaultTheme();
  },


  build() {
    if (!this.state.isEnabled) {
      this.buildEnablePage();
    } else if (!this.state.isSelected) {
      this.buildSelectPage();
    } else {
      this.buildSettingPage();
    }
  },


  onPause() {
    console.log("pause");
  },


  onResume() {
    console.log("resume");

    this.state.isEnabled = keyboardIsEnabled();
    this.state.isSelected = keyboardIsSelected();

    this.clearPage();
    this.build();
    this.refreshLayout();
    this.scrollToTop();
  },


  scrollToTop() {
    scrollTo({
      y: 0,
    });
  },


  refreshLayout() {
    if (this.state.vc) {
      updateLayout(this.state.vc);
    }
  },


  clearPage() {
    if (this.state.vc) {
      removeElement(this.state.vc);
      this.state.vc = null;
    }
  },


  buildEnablePage() {
    const vc = createPageContainer();
    this.state.vc = vc;


    createWidget(widget.TEXT, {
      parent: vc,
      text: `Enable ${appName}`,
      ...defaultTextStyle,
      layout: {
        width: "100%",
        height: "auto",
        font_size: px(40),
      },
    });


    const imageContainer = createWidget(widget.VIRTUAL_CONTAINER, {
      parent: vc,
      layout: {
        width: px(336),
        height: px(126),
      },
    });


    createWidget(widget.IMG, {
      parent: imageContainer,
      src: "image/keyboard_setting.png",
      auto_scale: true,
      layout: {
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        tags: "ignore-layout",
      },
    });


    createWidget(widget.TEXT, {
      parent: imageContainer,
      text: appName,
      ...defaultTextStyle,
      align_h: align.LEFT,
      layout: {
        left: px(20),
        width: "auto",
        max_width: px(200),
        height: px(70),
        font_size: px(27),
        line_clamp: 2,
      },
    });


    createWidget(widget.TEXT, {
      parent: vc,
      text: `Please toggle ${appName} on in settings`,
      ...defaultTextStyle,
      layout: {
        width: "100%",
        height: "auto",
        font_size: px(36),
      },
    });


    createMenuButton(vc, "Go to Settings", () => {
      keyboardGotoSettings();
    });

    createAboutButton(vc);
    createBottomSpacer(vc);
  },


  buildSelectPage() {
    const vc = createPageContainer();
    this.state.vc = vc;


    createWidget(widget.TEXT, {
      parent: vc,
      text: `Enable ${appName}`,
      ...defaultTextStyle,
      layout: {
        width: "100%",
        height: "auto",
        font_size: px(40),
      },
    });


    createWidget(widget.IMG, {
      parent: vc,
      src: "image/keyboard_enable.png",
      auto_scale: true,
      layout: {
        width: px(336),
        height: px(126),
      },
    });


    createWidget(widget.TEXT, {
      parent: vc,
      text: `Touch and hold the Globe key on the keyboard, then select ${appName}`,
      ...defaultTextStyle,
      layout: {
        width: "100%",
        height: "auto",
        font_size: px(36),
      },
    });


    createMenuButton(vc, "Show Keyboard", () => {
      this.keyboard(() => {
        this.onResume();
      });
    });

    createAboutButton(vc);
    createMenuButton(vc, "Exit", () => {
      exit();
    });
    createBottomSpacer(vc);
  },


  buildSettingPage() {
    const vc = createPageContainer();
    this.state.vc = vc;


    showToast({
      content: "You're all set",
    });


    createWidget(widget.TEXT, {
      parent: vc,
      text: appName,
      ...defaultTextStyle,
      layout: {
        width: "100%",
        height: "auto",
        font_size: px(40),
      },
    });


    createMenuButton(vc, "Show Keyboard", () => {
      this.keyboard();
    });


    createMenuButton(vc, "Go To Settings", () => {
      keyboardGotoSettings();
    });


    createAboutButton(vc);


    createMenuButton(vc, "Exit", () => {
      exit();
    });


    createBottomSpacer(vc);
  },


  keyboard(cb) {
    createKeyboard({
      onComplete: (kb, result) => {
        console.log("complete");

        deleteKeyboard();

        showToast({
          content: "Input: " + result.data,
        });

        if (cb) {
          cb();
        }
      },

      onCancel: () => {
        console.log("cancel");

        deleteKeyboard();

        if (cb) {
          cb();
        }
      },
    });
  },
});