'use client';

import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/ui';

const treeVariants = cva(
  'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-muted before:h-[2rem] before:-z-10',
  {
    variants: {
      compact: {
        true: 'before:h-[2rem] py-1',
        false: 'before:h-[2rem] py-2',
      },
    },
    defaultVariants: {
      compact: false,
    },
  }
);

const selectedTreeVariants = cva(
  'before:opacity-100 before:bg-accent text-accent-foreground font-medium'
);

const dragOverVariants = cva(
  'before:opacity-100 before:bg-primary/20 text-primary'
);

interface TreeDataItem {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  selectedIcon?: React.ComponentType<{ className?: string }>;
  openIcon?: React.ComponentType<{ className?: string }>;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  disabled?: boolean;
  className?: string;
}

type TreeRenderItemParams = {
  item: TreeDataItem;
  level: number;
  isLeaf: boolean;
  isSelected: boolean;
  isOpen?: boolean;
  hasChildren: boolean;
};

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  onItemDoubleClick?: (item: TreeDataItem) => void;
  expandAll?: boolean;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  // Multi-select props
  multiSelect?: boolean;
  selectedItemIds?: string[];
  onMultiSelectChange?: (items: TreeDataItem[]) => void;
  // Custom selected tree variants
  selectedTreeVariantsClass?: string;
  // Optional compact view
  compact?: boolean;
};

// Helper function to find item by ID in tree
function findItemById(
  id: string,
  items: TreeDataItem[] | TreeDataItem
): TreeDataItem | undefined {
  const itemList = Array.isArray(items) ? items : [items];
  for (const item of itemList) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(id, item.children);
      if (found) return found;
    }
  }
  return undefined;
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      onItemDoubleClick,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      renderItem,
      multiSelect,
      selectedItemIds: controlledSelectedItemIds,
      onMultiSelectChange,
      selectedTreeVariantsClass,
      compact = false,
      ...props
    },
    ref
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<
      string | undefined
    >(initialSelectedItemId);

    const [internalSelectedItemIds, setInternalSelectedItemIds] =
      React.useState<string[]>(controlledSelectedItemIds || []);

    React.useEffect(() => {
      setSelectedItemId(initialSelectedItemId);
    }, [initialSelectedItemId]);

    React.useEffect(() => {
      if (controlledSelectedItemIds) {
        setInternalSelectedItemIds(controlledSelectedItemIds);
      }
    }, [controlledSelectedItemIds]);

    const selectedItemIds = React.useMemo(
      () =>
        multiSelect ? controlledSelectedItemIds || internalSelectedItemIds : [],
      [multiSelect, controlledSelectedItemIds, internalSelectedItemIds]
    );

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(
      null
    );

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined, event?: React.MouseEvent) => {
        if (multiSelect && item) {
          const newSelectedIds = [...selectedItemIds];
          const index = newSelectedIds.indexOf(item.id);

          if (event?.shiftKey || event?.metaKey || event?.ctrlKey) {
            // Toggle selection
            if (index > -1) {
              newSelectedIds.splice(index, 1);
            } else {
              newSelectedIds.push(item.id);
            }
          } else {
            // Replace selection
            newSelectedIds.length = 0;
            newSelectedIds.push(item.id);
          }

          setInternalSelectedItemIds(newSelectedIds);

          if (onMultiSelectChange) {
            const selectedItems = newSelectedIds
              .map((id) => findItemById(id, data))
              .filter((item): item is TreeDataItem => item !== undefined);
            onMultiSelectChange(selectedItems);
          }
        } else {
          setSelectedItemId(item?.id);
          if (onSelectChange) {
            onSelectChange(item);
          }
        }
      },
      [onSelectChange, multiSelect, selectedItemIds, onMultiSelectChange, data]
    );

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item);
    }, []);

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem);
        }
        setDraggedItem(null);
      },
      [draggedItem, onDocumentDrag]
    );

    const expandedItemIds = React.useMemo(() => {
      if (expandAll) {
        const ids: string[] = [];
        const visited = new Set<string>();
        function collectAllIds(items: TreeDataItem[] | TreeDataItem) {
          const itemList = Array.isArray(items) ? items : [items];
          for (const item of itemList) {
            if (visited.has(item.id)) continue;
            visited.add(item.id);
            ids.push(item.id);
            if (item.children) {
              collectAllIds(item.children);
            }
          }
        }
        collectAllIds(data);
        return ids;
      }

      if (!initialSelectedItemId) {
        return [] as string[];
      }

      const ids: string[] = [];
      const visited = new Set<string>();

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string
      ): boolean {
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (visited.has(item.id)) continue;
            visited.add(item.id);

            ids.push(item.id);
            if (walkTreeItems(item, targetId)) {
              return true;
            }
            ids.pop();
          }
        } else if (items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
        return false;
      }

      walkTreeItems(data, initialSelectedItemId);
      return ids;
    }, [data, expandAll, initialSelectedItemId]);

    return (
      <div
        className={cn('relative overflow-hidden', !compact && 'p-2', className)}
      >
        <TreeItem
          data={data}
          ref={ref}
          selectedItemId={selectedItemId}
          selectedItemIds={selectedItemIds}
          multiSelect={multiSelect}
          handleSelectChange={handleSelectChange}
          onItemDoubleClick={onItemDoubleClick}
          expandedItemIds={expandedItemIds}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          renderItem={renderItem}
          selectedTreeVariantsClass={selectedTreeVariantsClass}
          compact={compact}
          level={0}
          {...props}
        />
        <div
          className="max-h-[48px] w-full"
          onDrop={() => {
            handleDrop({ id: '', name: 'parent_div' });
          }}
        ></div>
      </div>
    );
  }
);
TreeView.displayName = 'TreeView';

type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  selectedItemIds?: string[];
  multiSelect?: boolean;
  handleSelectChange: (
    item: TreeDataItem | undefined,
    event?: React.MouseEvent
  ) => void;
  expandedItemIds: string[];
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
  level?: number;
  selectedTreeVariantsClass?: string;
  compact?: boolean;
};

const TreeItem = React.memo(
  React.forwardRef<HTMLDivElement, TreeItemProps>(
    (
      {
        className,
        data,
        selectedItemId,
        selectedItemIds,
        multiSelect,
        handleSelectChange,
        expandedItemIds,
        defaultNodeIcon,
        defaultLeafIcon,
        handleDragStart,
        handleDrop,
        draggedItem,
        renderItem,
        level,
        selectedTreeVariantsClass,
        compact,
        // These props come from TreeProps but are not used in TreeItem - extracted to prevent DOM warnings
        onSelectChange: _,
        expandAll: __,
        initialSelectedItemId: ___,
        onDocumentDrag: ____,
        onItemDoubleClick,
        onMultiSelectChange: _____,
        ...props
      },
      ref
    ) => {
      // Intentionally unused - extracted from props to prevent passing to DOM
      void [_, __, ___, ____, _____, compact];
      if (!Array.isArray(data)) {
        data = [data];
      }
      return (
        <div ref={ref} role="tree" className={className} {...props}>
          <ul>
            {data.map((item) => (
              <li key={item.id}>
                {item.children ? (
                  <TreeNode
                    item={item}
                    level={level ?? 0}
                    selectedItemId={selectedItemId}
                    selectedItemIds={selectedItemIds}
                    multiSelect={multiSelect}
                    expandedItemIds={expandedItemIds}
                    handleSelectChange={handleSelectChange}
                    onItemDoubleClick={onItemDoubleClick}
                    defaultNodeIcon={defaultNodeIcon}
                    defaultLeafIcon={defaultLeafIcon}
                    handleDragStart={handleDragStart}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    renderItem={renderItem}
                    selectedTreeVariantsClass={selectedTreeVariantsClass}
                    compact={compact}
                  />
                ) : (
                  <TreeLeaf
                    item={item}
                    level={level ?? 0}
                    selectedItemId={selectedItemId}
                    selectedItemIds={selectedItemIds}
                    multiSelect={multiSelect}
                    handleSelectChange={handleSelectChange}
                    onItemDoubleClick={onItemDoubleClick}
                    defaultLeafIcon={defaultLeafIcon}
                    handleDragStart={handleDragStart}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    renderItem={renderItem}
                    selectedTreeVariantsClass={selectedTreeVariantsClass}
                    compact={compact}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
  )
);
TreeItem.displayName = 'TreeItem';

const TreeNode = React.memo(
  ({
    item,
    handleSelectChange,
    onItemDoubleClick,
    expandedItemIds,
    selectedItemId,
    selectedItemIds,
    multiSelect,
    defaultNodeIcon,
    defaultLeafIcon,
    handleDragStart,
    handleDrop,
    draggedItem,
    renderItem,
    level = 0,
    selectedTreeVariantsClass,
    compact,
  }: {
    item: TreeDataItem;
    handleSelectChange: (
      item: TreeDataItem | undefined,
      event?: React.MouseEvent
    ) => void;
    onItemDoubleClick?: (item: TreeDataItem) => void;
    expandedItemIds: string[];
    selectedItemId?: string;
    selectedItemIds?: string[];
    multiSelect?: boolean;
    defaultNodeIcon?: React.ComponentType<{ className?: string }>;
    defaultLeafIcon?: React.ComponentType<{ className?: string }>;
    handleDragStart?: (item: TreeDataItem) => void;
    handleDrop?: (item: TreeDataItem) => void;
    draggedItem: TreeDataItem | null;
    renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
    level?: number;
    selectedTreeVariantsClass?: string;
    compact?: boolean;
  }) => {
    const [value, setValue] = React.useState(
      expandedItemIds.includes(item.id) ? [item.id] : []
    );

    React.useEffect(() => {
      if (expandedItemIds.includes(item.id)) {
        setValue((prev) =>
          prev.includes(item.id) ? prev : [...prev, item.id]
        );
      } else {
        setValue((prev) => prev.filter((id) => id !== item.id));
      }
    }, [expandedItemIds, item.id]);

    const [isDragOver, setIsDragOver] = React.useState(false);
    const hasChildren = !!item.children?.length;
    const isSelected = multiSelect
      ? selectedItemIds?.includes(item.id) || false
      : selectedItemId === item.id;
    const isOpen = value.includes(item.id);

    const onDragStart = (e: React.DragEvent) => {
      if (!item.draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', item.id);
      handleDragStart?.(item);
    };

    const onDragOver = (e: React.DragEvent) => {
      if (
        item.droppable !== false &&
        draggedItem &&
        draggedItem.id !== item.id
      ) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleDrop?.(item);
    };

    const selectedVariants =
      selectedTreeVariantsClass || selectedTreeVariants();

    return (
      <AccordionPrimitive.Root
        type="multiple"
        value={value}
        onValueChange={(s) => setValue(s)}
      >
        <AccordionPrimitive.Item value={item.id}>
          <AccordionTrigger
            className={cn(
              treeVariants({ compact }),
              isSelected && selectedVariants,
              isDragOver && dragOverVariants(),
              item.disabled &&
                'pointer-events-none cursor-not-allowed opacity-50',
              item.className
            )}
            onClick={(e) => {
              if (item.disabled) return;
              handleSelectChange(item, e);
              item.onClick?.();
            }}
            onDoubleClick={(e) => {
              if (item.disabled) return;
              e.stopPropagation();
              onItemDoubleClick?.(item);
              item.onDoubleClick?.();
            }}
            draggable={!!item.draggable && !item.disabled}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
              if (item.disabled) return;
              onDrop(e);
            }}
          >
            {renderItem ? (
              renderItem({
                item,
                level,
                isLeaf: false,
                isSelected,
                isOpen,
                hasChildren,
              })
            ) : (
              <>
                <TreeIcon
                  item={item}
                  isSelected={isSelected}
                  isOpen={isOpen}
                  default={defaultNodeIcon}
                />
                <span className="truncate text-sm">{item.name}</span>
                <TreeActions isSelected={isSelected}>
                  {item.actions}
                </TreeActions>
              </>
            )}
          </AccordionTrigger>
          <AccordionContent className="ml-4 pl-1">
            <TreeItem
              data={item.children ? item.children : item}
              selectedItemId={selectedItemId}
              selectedItemIds={selectedItemIds}
              multiSelect={multiSelect}
              handleSelectChange={handleSelectChange}
              onItemDoubleClick={onItemDoubleClick}
              expandedItemIds={expandedItemIds}
              defaultLeafIcon={defaultLeafIcon}
              defaultNodeIcon={defaultNodeIcon}
              handleDragStart={handleDragStart}
              handleDrop={handleDrop}
              draggedItem={draggedItem}
              renderItem={renderItem}
              selectedTreeVariantsClass={selectedTreeVariantsClass}
              compact={compact}
              level={level + 1}
            />
          </AccordionContent>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
    );
  }
);
TreeNode.displayName = 'TreeNode';

const TreeLeaf = React.memo(
  React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
      item: TreeDataItem;
      level: number;
      selectedItemId?: string;
      selectedItemIds?: string[];
      multiSelect?: boolean;
      handleSelectChange: (
        item: TreeDataItem | undefined,
        event?: React.MouseEvent
      ) => void;
      onItemDoubleClick?: (item: TreeDataItem) => void;
      defaultLeafIcon?: React.ComponentType<{ className?: string }>;
      handleDragStart?: (item: TreeDataItem) => void;
      handleDrop?: (item: TreeDataItem) => void;
      draggedItem: TreeDataItem | null;
      renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
      selectedTreeVariantsClass?: string;
      compact?: boolean;
    }
  >(
    (
      {
        className,
        item,
        level,
        selectedItemId,
        selectedItemIds,
        multiSelect,
        handleSelectChange,
        onItemDoubleClick,
        defaultLeafIcon,
        handleDragStart,
        handleDrop,
        draggedItem,
        renderItem,
        selectedTreeVariantsClass,
        compact,
        ...props
      },
      ref
    ) => {
      const [isDragOver, setIsDragOver] = React.useState(false);
      const isSelected = multiSelect
        ? selectedItemIds?.includes(item.id) || false
        : selectedItemId === item.id;

      const onDragStart = (e: React.DragEvent) => {
        if (!item.draggable || item.disabled) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', item.id);
        handleDragStart?.(item);
      };

      const onDragOver = (e: React.DragEvent) => {
        if (
          item.droppable !== false &&
          !item.disabled &&
          draggedItem &&
          draggedItem.id !== item.id
        ) {
          e.preventDefault();
          setIsDragOver(true);
        }
      };

      const onDragLeave = () => {
        setIsDragOver(false);
      };

      const onDrop = (e: React.DragEvent) => {
        if (item.disabled) return;
        e.preventDefault();
        setIsDragOver(false);
        handleDrop?.(item);
      };

      const selectedVariants =
        selectedTreeVariantsClass || selectedTreeVariants();

      return (
        <div
          ref={ref}
          className={cn(
            'ml-5 flex cursor-pointer items-center text-left select-none before:right-1',
            treeVariants({ compact }),
            className,
            isSelected && selectedVariants,
            isDragOver && dragOverVariants(),
            item.disabled &&
              'pointer-events-none cursor-not-allowed opacity-50',
            item.className
          )}
          onClick={(e) => {
            if (item.disabled) return;
            handleSelectChange(item, e);
            item.onClick?.();
          }}
          onDoubleClick={(e) => {
            if (item.disabled) return;
            e.stopPropagation();
            onItemDoubleClick?.(item);
            item.onDoubleClick?.();
          }}
          draggable={!!item.draggable && !item.disabled}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          {...props}
        >
          {renderItem ? (
            <>
              <div className="mr-1 h-4 w-4 shrink-0" />
              {renderItem({
                item,
                level,
                isLeaf: true,
                isSelected,
                hasChildren: false,
              })}
            </>
          ) : (
            <>
              <TreeIcon
                item={item}
                isSelected={isSelected}
                default={defaultLeafIcon}
              />
              <span className="flex-grow truncate text-sm">{item.name}</span>
              <TreeActions isSelected={isSelected && !item.disabled}>
                {item.actions}
              </TreeActions>
            </>
          )}
        </div>
      );
    }
  )
);
TreeLeaf.displayName = 'TreeLeaf';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, onClick, onDoubleClick, ...props }, ref) => (
  <AccordionPrimitive.Header
    className={cn('flex w-full flex-1 items-center transition-all', className)}
  >
    <AccordionPrimitive.Trigger
      ref={ref}
      className="flex cursor-pointer items-center transition-all [&[data-state=open]>svg]:rotate-90"
      {...props}
    >
      <ChevronRight className="text-muted-foreground mr-1 h-4 w-4 shrink-0 transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
    <div
      className="flex flex-1 cursor-pointer items-center"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onClick) {
          onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }
        e.stopPropagation();
      }}
      onDoubleClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onDoubleClick) {
          onDoubleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all',
      className
    )}
    {...props}
  >
    <div className="py-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  default?: React.ComponentType<{ className?: string }>;
}) => {
  let Icon: React.ComponentType<{ className?: string }> | undefined =
    defaultIcon;
  if (isSelected && item.selectedIcon) {
    Icon = item.selectedIcon;
  } else if (isOpen && item.openIcon) {
    Icon = item.openIcon;
  } else if (item.icon) {
    Icon = item.icon;
  }
  return Icon ? <Icon className="mr-2 h-4 w-4 shrink-0" /> : <></>;
};

const TreeActions = ({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) => {
  return (
    <div
      className={cn(
        isSelected ? 'block' : 'hidden',
        'absolute right-3 group-hover:block'
      )}
    >
      {children}
    </div>
  );
};

export {
  TreeView,
  type TreeDataItem,
  type TreeRenderItemParams,
  AccordionTrigger,
  AccordionContent,
  TreeLeaf,
  TreeNode,
  TreeItem,
};
