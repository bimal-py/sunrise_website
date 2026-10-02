"use client";

import { useState } from "react";
import { OFFERING_ICONS, type OfferingIcon } from "@/shared/domain/offering";
import { OFFERING_ICON_COMPONENTS } from "@/shared/components/content/offering-icon";
import { labelClass } from "./ui";

/** Pick an offering's icon from the allowed set; sends its name as `name`. */
export function IconPicker({ name, label = "Icon", defaultValue }: { name: string; label?: string; defaultValue: OfferingIcon }) {
  const [value, setValue] = useState<OfferingIcon>(defaultValue);
  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {OFFERING_ICONS.map((icon) => {
          const Icon = OFFERING_ICON_COMPONENTS[icon];
          const selected = icon === value;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => setValue(icon)}
              aria-pressed={selected}
              aria-label={icon}
              title={icon}
              className={`flex size-11 items-center justify-center rounded-control border transition-colors duration-150 ${selected ? "border-primary bg-primary-soft text-primary" : "border-line-strong text-muted hover:border-primary hover:text-strong"}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
