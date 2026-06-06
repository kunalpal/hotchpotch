'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useRouter } from '@bprogress/next/app';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface SearchBarProps {
  placeholder?: string;
  inputClassName?: string;
  iconClassName?: string;
}

export default function SearchBar({
  placeholder = 'Search...',
  inputClassName = 'w-full bg-card pl-9 focus-visible:shadow-md',
  iconClassName = 'absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground',
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSearch = params.get('search') || '';

    if (currentSearch === debouncedSearch) return;

    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, router, pathname, searchParams]);

  const lastSyncedSearch = useRef(initialSearch);

  return (
    <div className="relative w-full">
      <Search className={iconClassName} />
      <Input
        placeholder={placeholder}
        className={inputClassName}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          lastSyncedSearch.current = e.target.value;
        }}
        data-test-id="search-input"
      />
      {search && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 px-0 hover:bg-transparent"
          onClick={() => setSearch('')}
          data-test-id="clear-search-button"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
