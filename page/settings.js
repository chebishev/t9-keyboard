import {
    createWidget,
    widget
} from '@zos/ui'

Page({
    build() {
        createWidget(widget.WIDGET_PICKER, {
            title: 'Скорость\nввода',
            subtitle: '',
            nb_of_columns: 1,
            init_col_index: 0,
            data_config: [
                {
                    data_array: new Array(200, 400, 600, 800, 1000),
                    init_val_index: 3,
                    support_loop: true,
                    font_name: 'fonts/x.ttf',
                    font_size: 16,
                    select_font_size: 48,
                    connector_font_size: 18,
                    unit_font_size: 14,
                    col_width: 80,
                },
            ],
            
            picker_cb: (picker, eventType, column, valueIndex) => {
                console.log('picker event', eventType, column, valueIndex)
            },
        })
    }
})