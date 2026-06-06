import { cva, VariantProps } from 'class-variance-authority';
import { FC } from 'react';
import { Loader as LucideLoader } from 'lucide-react';

const loaderStyles = cva('animate-spin', {
  variants: {
    size: {
      small: 'w-4 h-4',
      medium: 'w-6 h-6',
      large: 'w-8 h-8',
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

type LoaderProps = VariantProps<typeof loaderStyles>;

export const Loader: FC<LoaderProps> = ({ size }) => {
  return <LucideLoader className={loaderStyles({ size })} />;
};
