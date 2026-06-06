import * as React from 'react';
import CreatableSelect from 'react-select/creatable';
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
  Menu,
  MenuList,
  MultiValueRemove,
  Option,
} from '@/components/ui/react-select/custom-components';

const Creatable = React.forwardRef<
  React.ElementRef<typeof CreatableSelect>,
  React.ComponentPropsWithoutRef<typeof CreatableSelect> &
    VariantProps<typeof selectVariants>
>((props: Props & VariantProps<typeof selectVariants>, ref) => {
  const {
    isMulti,
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
    <CreatableSelect
      instanceId={id}
      isMulti={isMulti}
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
Creatable.displayName = 'Creatable';
export default Creatable;
