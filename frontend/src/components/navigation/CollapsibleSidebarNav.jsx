import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { NavLink, useLocation } from 'react-router-dom';

function pathMatches(pathname, search, to, { end = false } = {}) {
  if (!to) return false;
  const [path, query = ''] = to.split('?');
  const pathOk = end
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
  if (!pathOk) return false;
  if (!query) return true;
  const wanted = new URLSearchParams(query);
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of wanted.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function childIsActive(pathname, search, child, siblings = []) {
  if (!pathMatches(pathname, search, child.to, { end: child.end })) return false;
  const [path, query = ''] = child.to.split('?');
  if (query) return true;
  const querySiblingActive = siblings.some((sib) => {
    if (sib === child) return false;
    const [, sibQuery = ''] = (sib.to || '').split('?');
    return sibQuery && pathMatches(pathname, search, sib.to, { end: sib.end });
  });
  if (querySiblingActive && path === pathname) return false;
  return true;
}

function groupHasActive(pathname, search, children = []) {
  return children.some((child) => childIsActive(pathname, search, child, children));
}

export default function CollapsibleSidebarNav({
  items = [],
  onNavigate,
  accordion = true,
  workspaceLabel = 'Workspace',
  filterQuery = '',
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const search = location.search || '';
  const query = filterQuery.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    if (!query) return items;
    return items
      .map((item) => {
        if (item.type === 'group') {
          const children = (item.children || []).filter((child) => child.label.toLowerCase().includes(query));
          const groupMatch = item.label.toLowerCase().includes(query);
          if (groupMatch) return item;
          if (!children.length) return null;
          return { ...item, children };
        }
        return item.label.toLowerCase().includes(query) ? item : null;
      })
      .filter(Boolean);
  }, [items, query]);

  const activeGroupIds = useMemo(
    () => visibleItems
      .filter((item) => item.type === 'group' && groupHasActive(pathname, search, item.children))
      .map((item) => item.id),
    [visibleItems, pathname, search],
  );

  const [openIds, setOpenIds] = useState(() => new Set(activeGroupIds));

  useEffect(() => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      activeGroupIds.forEach((id) => next.add(id));
      if (query) visibleItems.forEach((item) => { if (item.type === 'group') next.add(item.id); });
      return next;
    });
  }, [activeGroupIds, query, visibleItems]);

  function handleToggle(id) {
    setOpenIds((prev) => {
      const isOpen = prev.has(id);
      if (accordion) {
        const next = new Set(activeGroupIds);
        if (isOpen && !activeGroupIds.includes(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      const next = new Set(prev);
      if (isOpen && !activeGroupIds.includes(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar">
      <p className="px-3 pb-3 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">{workspaceLabel}</p>
      <div className="space-y-1">
        {visibleItems.map((item) => {
          if (item.type === 'group') {
            const Icon = item.icon;
            const expanded = openIds.has(item.id) || activeGroupIds.includes(item.id) || Boolean(query);
            const parentActive = groupHasActive(pathname, search, item.children);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => handleToggle(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    parentActive
                      ? 'bg-sidebar-active text-white shadow-sm'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {Icon ? (
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${parentActive ? 'bg-white/20 text-white' : 'bg-white/15 text-white'}`}>
                      <Icon className="text-base" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <FiChevronDown className={`shrink-0 text-base text-white/70 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-200 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="ml-5 space-y-0.5 border-l border-white/15 py-1 pl-3">
                      {item.children.map((child) => {
                        const active = childIsActive(pathname, search, child, item.children);
                        return (
                          <NavLink
                            key={`${item.id}-${child.label}-${child.to}`}
                            to={child.to}
                            end={child.end}
                            onClick={onNavigate}
                            className={() => `block rounded-lg px-3 py-2 text-sm transition ${
                              active
                                ? 'bg-white/20 font-semibold text-white'
                                : 'font-medium text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.label}-${item.to}`}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={() => {
                const active = pathMatches(pathname, search, item.to, { end: item.end });
                return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-sidebar-active text-white shadow-sm'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`;
              }}
            >
              {Icon ? (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
                  <Icon className="text-base" />
                </span>
              ) : null}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {!visibleItems.length ? (
          <p className="px-3 py-6 text-center text-sm text-white/55">No menu matches “{filterQuery.trim()}”.</p>
        ) : null}
      </div>
    </nav>
  );
}
