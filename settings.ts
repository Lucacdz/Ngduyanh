// src/plugins/lucacAudio/settings.ts
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable LUCAC audio processing",
        default: true
    },
    singleMicMode: {
        type: OptionType.BOOLEAN,
        description: "Force single mic channel (mono)",
        default: true
    },
    iosCompensation: {
        type: OptionType.SLIDER,
        description: "iOS mic compensation gain",
        markers: [1, 1.5, 2, 2.5, 3],
        default: 2.2,
        stickToMarkers: false
    },
    showPanel: {
        type: OptionType.BOOLEAN,
        description: "Show floating panel",
        default: true
    }
});