import { useState } from "react";

type TimePickerProps = {
  "aria-describedby"?: string;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
  onChange: (value: string) => void;
  value: string;
};

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function getTimeParts(value: string) {
  const [hour = "", minute = ""] = value.split(":");

  return {
    hour: hours.includes(hour) ? hour : "",
    minute: minutes.includes(minute) ? minute : "",
  };
}

function getTimeValue({ hour, minute }: ReturnType<typeof getTimeParts>) {
  return hour && minute ? `${hour}:${minute}` : "";
}

function SelectChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12">
      <path d="m3 4.5 3 3 3-3" />
    </svg>
  );
}

export function TimePicker({
  "aria-describedby": ariaDescribedBy,
  disabled = false,
  invalid = false,
  label = "도착 시간",
  onChange,
  value,
}: TimePickerProps) {
  const [draftTime, setDraftTime] = useState(() => getTimeParts(value));
  const [previousValue, setPreviousValue] = useState(value);

  if (previousValue !== value) {
    setPreviousValue(value);
    const nextTime = getTimeParts(value);
    setDraftTime(nextTime);
  }

  function updateTime(nextHour: string, nextMinute: string) {
    const nextTime = { hour: nextHour, minute: nextMinute };

    setDraftTime(nextTime);
    onChange(getTimeValue(nextTime));
  }

  return (
    <div className="time-picker" aria-describedby={ariaDescribedBy} aria-label={label} role="group">
      <span className="time-picker-select">
        <select
          aria-label={`${label} 시`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(event) => updateTime(event.target.value, draftTime.minute)}
          value={draftTime.hour}
        >
          <option value="">--</option>
          {hours.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <SelectChevron />
      </span>
      <span aria-hidden="true" className="time-picker-separator">
        :
      </span>
      <span className="time-picker-select">
        <select
          aria-label={`${label} 분`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(event) => updateTime(draftTime.hour, event.target.value)}
          value={draftTime.minute}
        >
          <option value="">--</option>
          {minutes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <SelectChevron />
      </span>
    </div>
  );
}
