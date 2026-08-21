import type { ComponentPropsWithRef } from "react";

type NativeSelectProps = ComponentPropsWithRef<"select"> & {
  containerClassName?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function NativeSelectChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m3.5 6 4.5 4.5L12.5 6" />
    </svg>
  );
}

export function NativeSelect({
  children,
  className,
  containerClassName,
  ref,
  ...selectProps
}: NativeSelectProps) {
  return (
    <span className={joinClassNames("native-select", containerClassName)}>
      <select className={className} ref={ref} {...selectProps}>
        {children}
      </select>
      <NativeSelectChevron />
    </span>
  );
}
