'use client';

import * as React from 'react';
import SelectComponent from 'react-select';
import type { Props, ControlProps, GroupBase } from 'react-select';
import { cn } from '@/utils/ui';
import { type VariantProps } from 'class-variance-authority';
import {
  createClassNames,
  defaultStyles,
  selectVariants,
} from '@/components/ui/react-select/helper';
import {
  ClearIndicator,
  DropdownIndicator,
  MultiValueRemove,
  Option,
  Menu,
  MenuList,
} from '@/components/ui/react-select/custom-components';

const Select = React.forwardRef<
  React.ElementRef<typeof SelectComponent>,
  React.ComponentPropsWithoutRef<typeof SelectComponent> &
    VariantProps<typeof selectVariants>
>((props: Props & VariantProps<typeof selectVariants>, ref) => {
  const {
    value,
    onChange,
    options = [],
    styles = defaultStyles,
    classNames,
    components = {},
    size,
    ...rest
  } = props;

  const mergedClassNames = React.useMemo(() => {
    const baseClassNames = createClassNames(classNames || {});
    return {
      ...baseClassNames,
      control: (state: ControlProps<unknown, boolean, GroupBase<unknown>>) =>
        cn(selectVariants({ size }), baseClassNames?.control?.(state)),
    };
  }, [classNames, size]);

  const id = React.useId();

  return (
    <SelectComponent
      instanceId={id}
      ref={ref}
      value={value}
      onChange={onChange}
      options={options}
      unstyled
      components={{
        DropdownIndicator,
        ClearIndicator,
        MultiValueRemove,
        Option,
        Menu,
        MenuList,
        ...components,
      }}
      styles={styles}
      classNames={mergedClassNames}
      {...rest}
    />
  );
});
Select.displayName = 'Select';
export default Select;
