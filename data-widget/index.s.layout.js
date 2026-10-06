import { styles as baseStyles, h, DEVICE_WIDTH } from "./index.layout";
import { px } from "@zos/utils";

export const styles = {
  ...baseStyles,

  keyboard: {
    ...baseStyles.keyboard,
    layout: {
      ...baseStyles.keyboard.layout,
      top: 10,
    },
  },

  keyboardRow: {
    ...baseStyles.keyboardRow,
    layout: {
      ...baseStyles.keyboardRow.layout,
      height: "13vh",
    },
  },

  keyButton: {
    ...baseStyles.keyButton,
    layout: {
      ...baseStyles.keyButton.layout,
      width: "32%",
    },
  },

  deleteKey: {
    ...baseStyles.deleteKey,
    x: DEVICE_WIDTH - px(70),
    y: h - px(56),
  },

  actionKeyContainer: {
    ...baseStyles.actionKeyContainer,
    layout: {
      ...baseStyles.actionKeyContainer.layout,
      width: "24%",
    },
  },
};