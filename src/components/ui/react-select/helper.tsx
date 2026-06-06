import { cn } from '@/utils/ui';
import {
  type ClassNamesConfig,
  type GroupBase,
  type StylesConfig,
} from 'react-select';
import { cva } from 'class-variance-authority';
/**
 * styles that aligns with shadcn/ui
 */
const controlStyles = {
  base: 'flex w-full items-center rounded-md border border-input bg-background gap-1 transition-colors hover:cursor-pointer',
  focus: 'outline-none border-muted-foreground ring-none',
  disabled: 'cursor-not-allowed opacity-50',
};
const placeholderStyles = 'text-sm text-border';
const valueContainerStyles = 'gap-1 flex flex-wrap';
const multiValueStyles =
  'inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-1.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
const indicatorsContainerStyles = 'gap-1';
const clearIndicatorStyles = 'p-1 rounded-md';
const indicatorSeparatorStyles = 'bg-background';
const dropdownIndicatorStyles = 'p-[3px] rounded-md';
const menuStyles =
  'p-1 mt-1 border bg-card shadow-md rounded-md text-card-foreground';
const groupHeadingStyles =
  'py-2 px-1 text-muted-foreground text-sm font-semibold';
const optionStyles = {
  base: 'hover:cursor-pointer hover:bg-primary hover:text-primary-foreground px-2 py-1.5 rounded-sm !text-sm !cursor-default !select-none !outline-none font-sans',
  focus: 'active:bg-primary/90 bg-primary text-primary-foreground',
  disabled: 'pointer-events-none opacity-50',
  selected: '',
};
const noOptionsMessageStyles =
  'text-muted-foreground text-sm p-2 border border-dashed border-border rounded-md';
const loadingIndicatorStyles =
  'flex items-center justify-center h-4 w-4 opacity-50';
const loadingMessageStyles = 'text-primary-foreground p-2 bg-primary';

export const selectVariants = cva('', {
  variants: {
    size: {
      default: 'min-h-10 pl-3 pr-1 py-2 text-sm',
      sm: 'min-h-9 pl-3 pr-1 py-1 text-sm',
      xs: 'min-h-7 pl-2 pr-1 py-0.5 text-xs',
      lg: 'min-h-11 pl-3 pr-1 py-2.5 text-base',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

/**
 * This factory method is used to build custom classNames configuration
 */
export const createClassNames = (
  classNames?: ClassNamesConfig
): ClassNamesConfig => {
  return {
    clearIndicator: (state) =>
      cn(clearIndicatorStyles, classNames?.clearIndicator?.(state)),
    container: (state) => cn(classNames?.container?.(state)),
    control: (state) =>
      cn(
        controlStyles.base,
        state.isDisabled && controlStyles.disabled,
        state.isFocused && controlStyles.focus,
        classNames?.control?.(state)
      ),
    dropdownIndicator: (state) =>
      cn(dropdownIndicatorStyles, classNames?.dropdownIndicator?.(state)),
    group: (state) => cn(classNames?.group?.(state)),
    groupHeading: (state) =>
      cn(groupHeadingStyles, classNames?.groupHeading?.(state)),
    indicatorsContainer: (state) =>
      cn(indicatorsContainerStyles, classNames?.indicatorsContainer?.(state)),
    indicatorSeparator: (state) =>
      cn(indicatorSeparatorStyles, classNames?.indicatorSeparator?.(state)),
    input: (state) => cn(classNames?.input?.(state)),
    loadingIndicator: (state) =>
      cn(loadingIndicatorStyles, classNames?.loadingIndicator?.(state)),
    loadingMessage: (state) =>
      cn(loadingMessageStyles, classNames?.loadingMessage?.(state)),
    menu: (state) => cn(menuStyles, classNames?.menu?.(state)),
    menuList: (state) => cn(classNames?.menuList?.(state)),
    menuPortal: (state) => cn(classNames?.menuPortal?.(state)),
    multiValue: (state) =>
      cn(multiValueStyles, classNames?.multiValue?.(state)),
    multiValueLabel: (state) => cn(classNames?.multiValueLabel?.(state)),
    multiValueRemove: (state) => cn(classNames?.multiValueRemove?.(state)),
    noOptionsMessage: (state) =>
      cn(noOptionsMessageStyles, classNames?.noOptionsMessage?.(state)),
    option: (state) =>
      cn(
        optionStyles.base,
        state.isFocused && optionStyles.focus,
        state.isDisabled && optionStyles.disabled,
        state.isSelected && optionStyles.selected,
        classNames?.option?.(state)
      ),
    placeholder: (state) =>
      cn(placeholderStyles, classNames?.placeholder?.(state)),
    singleValue: (state) => cn(classNames?.singleValue?.(state)),
    valueContainer: (state) =>
      cn(valueContainerStyles, classNames?.valueContainer?.(state)),
  };
};
export const defaultClassNames = createClassNames({});
export const defaultStyles: StylesConfig<
  unknown,
  boolean,
  GroupBase<unknown>
> = {
  input: (base) => ({
    ...base,
    'input:focus': {
      boxShadow: 'none',
    },
  }),
  multiValueLabel: (base) => ({
    ...base,
    whiteSpace: 'normal',
    overflow: 'visible',
  }),
  control: (base) => ({
    ...base,
    transition: 'none',
    // minHeight: '2.25rem', // we used !min-h-9 instead
  }),
  menuList: (base) => ({
    ...base,
    '::-webkit-scrollbar': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: 'hsl(var(--border))',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: 'transparent',
    },
  }),
};
