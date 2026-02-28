import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { Category } from '../../types';

interface Props {
  categories: Category[];
  value: Category[];
  onChange: (categories: Category[]) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableCategorySelect({ 
  categories, 
  value, 
  onChange, 
  placeholder = '카테고리 검색...',
  className = ''
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format a label for a category
  const getLabel = (cat: Category) => {
    if (!cat.sub) return cat.major;
    return `${cat.major} > ${cat.sub}`;
  };

  // Combine majors and specific categories
  const allOptions = useMemo(() => {
    // We already have specific sub-categories in `categories`.
    // Some of `categories` might just be majors (sub === null).
    // Let's create a combined list where we explicitly show Major alone, and then its subs.
    const options: Category[] = [];
    
    // Group by major
    const grouped = new Map<string, Category[]>();
    categories.forEach(c => {
      if (!grouped.has(c.major)) grouped.set(c.major, []);
      grouped.get(c.major)!.push(c);
    });

    grouped.forEach((groupCats, majorName) => {
      // Find if the actual major root exists
      const root = groupCats.find(c => !c.sub);
      if (root) {
        options.push(root);
      } else {
        // Add a pseudo-root so users can select the major category entire family
        options.push({ id: -Date.now() - Math.random(), type: groupCats[0].type, major: majorName, sub: null });
      }
      
      // Add the subs
      groupCats.filter(c => c.sub).forEach(c => {
        options.push(c);
      });
    });
    
    return options;
  }, [categories]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return allOptions;
    const lower = searchTerm.toLowerCase();
    return allOptions.filter(cat => 
      cat.major.toLowerCase().includes(lower) || 
      (cat.sub && cat.sub.toLowerCase().includes(lower))
    );
  }, [allOptions, searchTerm]);

  const handleSelect = (clickedCat: Category) => {
    const isMajor = !clickedCat.sub;
    const majorName = clickedCat.major;

    // Get all real subcategories for this major from the original `categories` prop
    const subsForMajor = categories.filter(c => c.major === majorName && c.sub);
    const majorSyntheticCat = allOptions.find(c => c.major === majorName && !c.sub);

    // Current state analysis
    const isMajorSelected = value.some(v => v.major === majorName && !v.sub);
    const selectedSubs = value.filter(v => v.major === majorName && v.sub);

    let nextValue = [...value];

    if (isMajor) {
      if (isMajorSelected) {
        // Turning OFF major
        // Remove major and all subs from selection
        nextValue = nextValue.filter(v => v.major !== majorName);
      } else {
        // Turning ON major
        // Remove individual subs and add major
        nextValue = nextValue.filter(v => v.major !== majorName);
        if (majorSyntheticCat) nextValue.push(majorSyntheticCat);
      }
    } else {
      // Clicked a subcategory
      const isSubSelected = selectedSubs.some(v => v.id === clickedCat.id) || isMajorSelected;

      if (isSubSelected) {
        // Turning OFF sub
        if (isMajorSelected) {
          // It was indirectly selected via Major.
          // Remove Major, add all OTHER subs.
          nextValue = nextValue.filter(v => v.major !== majorName);
          const otherSubs = subsForMajor.filter(c => c.id !== clickedCat.id);
          nextValue.push(...otherSubs);
        } else {
          // It was directly selected. Just remove it.
          nextValue = nextValue.filter(v => v.id !== clickedCat.id);
        }
      } else {
        // Turning ON sub
        nextValue.push(clickedCat);
        // Check if all subs are now selected
        const newSelectedSubsCount = nextValue.filter(v => v.major === majorName && v.sub).length;
        if (newSelectedSubsCount === subsForMajor.length && subsForMajor.length > 0) {
          // All are selected! Replace with Major
          nextValue = nextValue.filter(v => v.major !== majorName);
          if (majorSyntheticCat) nextValue.push(majorSyntheticCat);
        }
      }
    }

    onChange(nextValue);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-violet-400 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex-1 truncate">
          {value.length > 0 ? (
            <span className="font-medium">
              {value.map(getLabel).join(', ')}
            </span>
          ) : (
             <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-slate-400">
          {value.length > 0 && (
            <X 
              size={16} 
              className="hover:text-slate-600 cursor-pointer" 
              onClick={clearSelection} 
            />
          )}
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center bg-slate-50 dark:bg-slate-800/50">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              autoFocus
              className="flex-1 bg-transparent border-none text-sm focus:outline-none"
              placeholder="카테고리 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <ul className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((cat, idx) => {
                const isMajorOnly = !cat.sub;
                let isSelected = false;

                if (isMajorOnly) {
                  // Major is selected if the major itself is in value, OR all its subs are in value
                  const isDirectlySelected = value.some(v => v.major === cat.major && !v.sub);
                  if (isDirectlySelected) {
                    isSelected = true;
                  } else {
                    const subsForMajor = categories.filter(c => c.major === cat.major && c.sub);
                    const selectedSubs = value.filter(v => v.major === cat.major && v.sub);
                    if (subsForMajor.length > 0 && selectedSubs.length === subsForMajor.length) {
                      isSelected = true;
                    }
                  }
                } else {
                  // Sub is selected if it is in value, OR its parent major is in value
                  const isParentMajorSelected = value.some(v => v.major === cat.major && !v.sub);
                  const isDirectlySelected = value.some(v => v.id === cat.id);
                  isSelected = isParentMajorSelected || isDirectlySelected;
                }

                return (
                  <li
                    key={`${cat.id}-${idx}`}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(cat);
                    }}
                  >
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} 
                        className="mr-2 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className={isMajorOnly ? 'font-bold' : 'pl-2 text-slate-600 dark:text-slate-300'}>
                        {isMajorOnly ? `[대분류] ${cat.major}` : cat.sub}
                      </span>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-4 text-sm text-center text-slate-500">
                검색 결과가 없습니다.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
