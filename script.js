document.addEventListener('DOMContentLoaded', function() {
  // Change html font size
    const htmlElement = document.documentElement;
    if (window.innerHeight < 640) {
        htmlElement.style.fontSize = "12px";
    }
     // Navbar Hidden On Scroll
        let lastScrollTop = 0;
        const navbar = document.getElementById("navbar");
        const seiNavbar = document.getElementById("sei-header");

        window.addEventListener("scroll", () => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll <= 0) {
            // At the top → Show navbar
            navbar.classList.remove("-translate-y-full");
            seiNavbar.classList.remove("max-h-0");
            seiNavbar.classList.add("max-h-[1000px]");
            return;
        }

        if (currentScroll > lastScrollTop) {
            // Scrolling down → Hide navbar
            navbar.classList.add("-translate-y-full",);
            seiNavbar.classList.add("max-h-0");
            seiNavbar.classList.remove("max-h-[1000px]");
        } else {
            // Scrolling up → Show navbar
            navbar.classList.remove("-translate-y-full");
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // Prevent negative scroll
        });

  // Navbar Mobile Toggle
  const navbarToggle = document.getElementById("navbarToggle");
  const mobileNavbar = document.getElementById("mobileNavbar");
  
  navbarToggle.addEventListener("click", () => {
    // Toggle mobile navbar visibility
    mobileNavbar.classList.toggle("max-h-120");
    mobileNavbar.classList.toggle("max-h-0");
    mobileNavbar.classList.toggle("mt-4");
  });

  // For individual dropdowns
  const dropdownButtons = document.querySelectorAll('.dropdown-btn');

  dropdownButtons.forEach(button => {
    button.addEventListener('click', () => {
      const submenu = button.nextElementSibling;
      const icon = button.querySelector('svg');

      // Close others
      dropdownButtons.forEach(otherButton => {
        const otherSubmenu = otherButton.nextElementSibling;
        const otherIcon = otherButton.querySelector('svg');

        if (otherButton !== button) {
          // Remove open duration, add close duration
          otherSubmenu.classList.remove('duration-500');
          otherSubmenu.classList.add('duration-200');

          otherSubmenu.classList.remove('max-h-96');
          otherSubmenu.classList.add('max-h-0');
          otherIcon.classList.remove('rotate-180');
        }
      });

      // Toggle this one
      if (submenu.classList.contains('max-h-0')) {
        // OPEN — use longer duration
        submenu.classList.remove('duration-200');
        submenu.classList.add('duration-500');
      } else {
        // CLOSE — use shorter duration
        submenu.classList.remove('duration-500');
        submenu.classList.add('duration-200');
      }

      submenu.classList.toggle('max-h-0');
      submenu.classList.toggle('max-h-96');
      icon.classList.toggle('rotate-180');
    });
  });

    function updatePhilippineTime() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat('en-PH', options);

    const targets = [
      document.getElementById('philippine-time'),
      document.getElementById('philippine-time2'),
      document.getElementById('philippine-time3'),
    ];

    targets.forEach(el => {
      if (el) el.textContent = formatter.format(now);
    });
  }

  updatePhilippineTime(); // initial update
  setInterval(updatePhilippineTime, 1000); // update every second



  // Initialize PDF.js worker
 pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let sidebarData = [];
  let searchQuery = '';
  let activeSection = null;
  let activeFile = null;
  let openDropdowns = [];
  let scrollPositions = {};
  let manuallyCollapsedDropdowns = [];


  fetch('data.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      sidebarData = data;

      const storedSection = localStorage.getItem('lastSection');
      const storedFile = localStorage.getItem('lastFile');
      const sectionExists = sidebarData.some(item => item.label === storedSection);
      if (storedSection && sectionExists) {
        activeSection = storedSection;
        activeFile = storedFile || null;
      } else {
        activeSection = null;
        activeFile = null;
      }


      renderSidebar();
      setupSidebarListeners();

      function findFirstPdf(data) {
        for (const item of data) {
          if ((item.type === 'file' || !item.type) && item.fileType?.toLowerCase() === 'pdf') {
            return {
              label: item.label,
              url: item.url,
              fileType: item.fileType,
              parentLabel: ''
            };
          } else if (item.type === 'dropdown' && Array.isArray(item.children)) {
            const child = item.children.find(
              c => (c.type === 'file' || !c.type) && c.fileType?.toLowerCase() === 'pdf'
            );
            if (child) {
              return {
                label: child.label,
                url: child.url,
                fileType: child.fileType,
                parentLabel: item.label
              };
            }
          }
        }
        return null;
      }

      // Find the first template
      function findFirstTemplate(data) {
        for (const item of data) {
          if ((item.type === 'file' || !item.type) && item.fileType?.toLowerCase() === 'template' && item.templateId) {
            return {
              label: item.label,
              templateId: item.templateId,
              parentLabel: ''
            };
          } else if (item.type === 'dropdown' && Array.isArray(item.children)) {
            const child = item.children.find(
              c => (c.type === 'file' || !c.type) && c.fileType?.toLowerCase() === 'template' && c.templateId
            );
            if (child) {
              return {
                label: child.label,
                templateId: child.templateId,
                parentLabel: item.label
              };
            }
          }
        }
        return null;
      }

      if (activeFile) {
        showContent(activeFile);
      } else {
        const defaultTemplate = findFirstTemplate(sidebarData);
        const defaultPdf = findFirstPdf(sidebarData);

        if (defaultTemplate) {
          const parentId = defaultTemplate.parentLabel; // e.g., 'dropdown-0'

          // Set the active file so it gets highlighted
          activeFile = `${defaultTemplate.parentLabel}/${defaultTemplate.label}`;
          activeSection = null;

          // Push to openDropdowns BEFORE renderSidebar
          if (parentId && !openDropdowns.includes(parentId)) {
            openDropdowns.push(parentId);
          }

          renderSidebar(); // render using updated openDropdowns + activeFile
          setupSidebarListeners();
          setupSidebarKeyboardNavigation();

          // 🔁 Wait a moment to allow DOM to render, then open dropdown smoothly
          setTimeout(() => {
            const dropdownEl = document.getElementById(parentId);
            if (dropdownEl) {
              collapseAllNestedDropdowns(dropdownEl); // optional if deeply nested
              animateDropdownOpen(dropdownEl);
            } else {
              console.warn("⚠️ Dropdown not found:", parentId);
            }
          }, 0);

          showContent(
            defaultTemplate.label,
            null,
            'template',
            defaultTemplate.parentLabel,
            defaultTemplate.templateId
          );
        } else if (defaultPdf) {
          const parentId = defaultPdf.parentLabel; // e.g., 'dropdown-0'

          // ✅ Set the active file so it gets highlighted
          activeFile = `${defaultPdf.parentLabel}/${defaultPdf.label}`;
          activeSection = null;

          // ✅ Push to openDropdowns BEFORE renderSidebar
          if (parentId && !openDropdowns.includes(parentId)) {
            openDropdowns.push(parentId);
          }

          renderSidebar(); // render using updated openDropdowns + activeFile
          setupSidebarListeners();
          setupSidebarKeyboardNavigation();

          // 🔁 Wait a moment to allow DOM to render, then open dropdown smoothly
          setTimeout(() => {
            const dropdownEl = document.getElementById(parentId);
            if (dropdownEl) {
              collapseAllNestedDropdowns(dropdownEl); // optional if deeply nested
              animateDropdownOpen(dropdownEl);
            } else {
              console.warn("⚠️ Dropdown not found:", parentId);
            }
          }, 0);

          showContent(
            defaultPdf.label,
            defaultPdf.url,
            defaultPdf.fileType,
            defaultPdf.parentLabel
          );
        } else {
          document.getElementById("main-content-annual-report").innerHTML =
            `<div class="text-red-500 p-4">No valid PDF or template found for preview.</div>`;
        }
      }


      setTimeout(() => {
        setupSidebarKeyboardNavigation();
      }, 0);


      // Attach search bar event
      const searchInput = document.getElementById('sidebar-search-annual-report');
      if (searchInput) {
        searchInput.addEventListener('input', function(e) {
          searchQuery = e.target.value.trim().toLowerCase();
          renderSidebar();
          setupSidebarListeners();
        });
      }
    })
    .catch(error => {
      document.getElementById('sidebar-menu-annual-report').innerHTML =
        `<div class="text-red-400 p-4">Error loading navigation data. Please try again later.</div>`;
    });

    function labelToId(label) {
  return label
    .toLowerCase().replace(/\s+/g,'-')
    .replace(/[^a-z0-9]+/g, '-')  
    .replace(/-+/g, '-')          
    .replace(/^-|-$/g, '')        
    + '-content';
}

  // Function to filter sidebar items based on search query
  function filterSidebarItems(items, query) {
    if (!query) return items;
    return items
      .map(item => {
        if (item.type === 'section' || item.type === 'dropdown') {
          if (item.children) {
            const filteredChildren = filterSidebarItems(item.children, query);
            if (filteredChildren.length > 0) {
              return { ...item, children: filteredChildren };
            }
          }
          if (item.label && item.label.toLowerCase().includes(query)) {
            return item;
          }
          return null;
        } else if (item.type === 'file' || item.type === 'folder') {
          if (item.label && item.label.toLowerCase().includes(query)) {
            return item;
          }
          return null;
        }
        return null;
      })
      .filter(Boolean);
  }

  function renderSidebar() {
    const filteredData = filterSidebarItems(sidebarData, searchQuery);

    if (searchQuery) {
      openDropdowns = collectAllDropdownsToOpen(filteredData)
        .filter(id => !manuallyCollapsedDropdowns.includes(id));
    } else {
      manuallyCollapsedDropdowns = [];

      // ✅ Auto-open the first dropdown if none are open
      if (!openDropdowns.length && filteredData.length) {
        const firstDropdown = filteredData.find(item => item.type === 'dropdown');
        if (firstDropdown) {
          const firstDropdownId = `dropdown-${filteredData.indexOf(firstDropdown)}`;
          openDropdowns.push(firstDropdownId);
        }
      }
    }

    document.getElementById('sidebar-menu-annual-report').innerHTML = renderItems(filteredData);
    setupSidebarListeners();
  }


 function setupSidebarListeners() {
    const sidebarMenu = document.getElementById('sidebar-menu-annual-report');
    if (!sidebarMenu) return;

    // Section click
    sidebarMenu.querySelectorAll('[data-section]').forEach(el => {
      el.onclick = e => {
        e.preventDefault();
        const focusedSection = el.getAttribute('data-section');

        activeSection = el.getAttribute('data-section');
        activeFile = null;
        openDropdowns = [];
        renderSidebar();
        setupSidebarListeners();
        setupSidebarKeyboardNavigation();

        showContent(activeSection);

        setTimeout(() => {
      const selector = `[data-section="${focusedSection}"]`;
      const newBtn = document.querySelector(`#sidebar-menu-annual-report ${selector}`);
      if (newBtn) newBtn.focus();
    }, 0);
      };
 

    });

    // Dropdown toggle (nested-aware)
sidebarMenu.querySelectorAll('[data-dropdown]').forEach(el => {
  el.onclick = e => {
    e.preventDefault();
    const focusedDropdown = el.getAttribute('data-dropdown');

    if (el.dataset.processing) return;

    el.dataset.processing = "true";
    setTimeout(() => {
      delete el.dataset.processing;
    }, 400); // Prevent another click for 400ms

    const dropdownId = focusedDropdown;
    const dropdownElement = document.getElementById(dropdownId);
    const isCurrentlyOpen = openDropdowns.includes(dropdownId);

    if (isCurrentlyOpen) {
      // CLOSE: Remove from openDropdowns AFTER animation completes
      animateDropdownClose(dropdownElement).then(() => {
        openDropdowns = openDropdowns.filter(id => !(id === dropdownId || id.startsWith(dropdownId + '-')));
        if (searchQuery) {
          manuallyCollapsedDropdowns.push(dropdownId);
        }

        renderSidebar();
        setupSidebarListeners();
        setupSidebarKeyboardNavigation();

        setTimeout(() => {
          const selector = `[data-dropdown="${focusedDropdown}"]`;
          const newBtn = document.querySelector(`#sidebar-menu-annual-report ${selector}`);
          if (newBtn) newBtn.focus();
        }, 0);
      });
    } else {
      // OPEN: Add to openDropdowns BEFORE rendering
      const collapsedIndex = manuallyCollapsedDropdowns.indexOf(dropdownId);
      if (collapsedIndex !== -1) {
        manuallyCollapsedDropdowns.splice(collapsedIndex, 1);
      }

      const parentPath = dropdownId.substring(0, dropdownId.lastIndexOf('-'));
      const elementsToClose = openDropdowns
        .filter(id => {
          const idParentPath = id.substring(0, id.lastIndexOf('-'));
          return idParentPath === parentPath && !dropdownId.startsWith(id);
        })
        .map(id => document.getElementById(id))
        .filter(el => el);

      // Close sibling dropdowns first
      const closePromises = elementsToClose.map(el => animateDropdownClose(el));
      
      // Remove closed siblings from openDropdowns
      openDropdowns = openDropdowns.filter(id => {
        return (
          dropdownId === id ||
          dropdownId.startsWith(id + '-') ||
          id.startsWith(dropdownId + '-') ||
          !elementsToClose.some(el => el && el.id === id)
        );
      });

      // Add current dropdown to openDropdowns
      if (!openDropdowns.includes(dropdownId)) {
        openDropdowns.push(dropdownId);
      }

      renderSidebar();
      setupSidebarListeners();
      setupSidebarKeyboardNavigation();

      setTimeout(() => {
        const newDropdownElement = document.getElementById(dropdownId);
        if (newDropdownElement) {
          collapseAllNestedDropdowns(newDropdownElement);
          animateDropdownOpen(newDropdownElement);
        }
        
        const selector = `[data-dropdown="${focusedDropdown}"]`;
        const newBtn = document.querySelector(`#sidebar-menu-annual-report ${selector}`);
        if (newBtn) newBtn.focus();
      }, 50);
    }
  };
});


    // File click
  sidebarMenu.querySelectorAll('[data-file]').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      const fileName = el.getAttribute('data-file');
      const fileUrl = el.getAttribute('data-url');
      const fileType = el.getAttribute('data-filetype');
      const parentName = el.getAttribute('data-parent');
      let templateId = el.getAttribute('data-templateid'); 

      // Always open in new tab for all file types
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      } else if (templateId) {
        // For templates, we'll need to handle them differently since they're in the DOM
        const template = document.getElementById(templateId);
        if (template) {
          // You could open the template content in a new window like this:
          const newWindow = window.open('', '_blank');
          newWindow.document.write(template.innerHTML);
          newWindow.document.close();
        }
      }
      
      // Update active state in sidebar
      activeFile = `${parentName || ''}/${fileName}`;
      activeSection = null;
      renderSidebar();
      setupSidebarListeners();
      setupSidebarKeyboardNavigation();
    };
  });

    }

function setupSidebarKeyboardNavigation() {
  // Clear old listener to prevent duplicates
  document.removeEventListener('keydown', keyboardHandler);
  document.addEventListener('keydown', keyboardHandler);
}

function keyboardHandler(e) {
  const active = document.activeElement;
  const isInput = active?.tagName === 'INPUT';

  // Allow typing in input
  if (isInput && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

  const searchInput = document.getElementById('sidebar-search');

  // Only include visible, focusable buttons
  const visibleButtons = Array.from(
    document.querySelectorAll('#sidebar-menu button:not(.hidden):not([disabled])')
  ).filter(el => {
    const parentDropdown = el.closest('.dropdown-content');
    return !parentDropdown || !parentDropdown.classList.contains('hidden');
  });

  const focusables = [
    ...(searchInput ? [searchInput] : []),
    ...visibleButtons,
  ];

  const currentIndex = focusables.indexOf(active);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setTimeout(() => {
      const next = focusables[currentIndex + 1] || focusables[0];
      next?.focus();
    }, 50); // wait for dropdown to fully render
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    setTimeout(() => {
      const prev = focusables[currentIndex - 1] || focusables[focusables.length - 1];
      prev?.focus();
    }, 50);
  }

  if (e.key === 'Enter') {
    if (active?.hasAttribute('data-dropdown') || active?.hasAttribute('data-file')) {
      const focusedDropdown = active.getAttribute('data-dropdown');
      const focusedFile = active.getAttribute('data-file');
      const focusedParent = active.getAttribute('data-parent');
      
      active.click();

      setTimeout(() => {
        const newButtons = Array.from(
          document.querySelectorAll('#sidebar-menu button:not(.hidden):not([disabled])')
        ).filter(el => {
          const parent = el.closest('.dropdown-content');
          return !parent || !parent.classList.contains('hidden');
        });

        if (focusedDropdown) {
          // For dropdowns, find the dropdown and focus next item
          const dropdownBtn = newButtons.find(btn => 
            btn.getAttribute('data-dropdown') === focusedDropdown
          );
          
          if (dropdownBtn) {
            const index = newButtons.indexOf(dropdownBtn);
            const next = newButtons[index + 1];
            if (next) {
              next.focus();
            } else {
              dropdownBtn.focus();
            }
          }
        } else if (focusedFile) {
          // For files, restore focus to the same file button
          const fileBtn = newButtons.find(btn => 
            btn.getAttribute('data-file') === focusedFile && 
            btn.getAttribute('data-parent') === focusedParent
          );
          if (fileBtn) {
            fileBtn.focus();
          }
        }
      }, 200); // longer delay to allow sidebar re-render
    }
  }
}

  function collectAllDropdownsToOpen(items, parentId = '') {
  const dropdownsToOpen = [];

  function recurse(children, parentId) {
    for (let i = 0; i < children.length; i++) {
      const item = children[i];
      const dropdownId = `${parentId}dropdown-${i}`;

      if (item.type === 'dropdown' && item.children?.length) {
        dropdownsToOpen.push(dropdownId);
        recurse(item.children, dropdownId + '-');
      }
    }
  }

  recurse(items, parentId);
  return dropdownsToOpen;
}

function highlightMatch(label) {
  if (!searchQuery) return label;
  const regex = new RegExp(`(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  return label.replace(regex, '<span class="text-[#F1CD6C] font-bold">$1</span>');
}


function renderItems(items, parentId = '', parentDropdownLabel = '', level = 0) {
    // File block: preserve star logic
    if (items.length && items.every(i => i.type === "file")) {
      let html = '<div class="sidebar-files-dropdown"><ul class="space-y-1">';
      items.forEach((item, idx) => {
        const fileKey = `${parentDropdownLabel || ''}/${item.label}`;
        const isActive = activeFile === fileKey;
        html += `
          <li>
            <button tabindex="0" class="cursor-pointer flex items-center w-full gap-3 py-3 px-8 rounded-lg hover:text-[#F1CD6C] transition-all duration-200 group justify-start ${isActive ? 'text-[#F1CD6C] font-bold' : 'text-white'}"
             data-file="${item.label}"
              data-filetype="${item.fileType || ''}"
              data-url="${item.url || ''}"
              data-templateid="${item.templateId ? item.templateId : ''}"
              data-parent="${parentDropdownLabel || ''}">
              
              <span class="max-w-full block font-medium text-left break-words" title="${item.label}">${highlightMatch(item.label)}</span>
              ${item.fileType === 'pdf' ? `
              <span class="ml-auto text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                PDF
              </span>
            ` : item.fileType === 'image' ? `
              <span class="ml-auto text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-medium">
                IMG
              </span>
            ` : item.fileType === 'link' ? `
              <span class="ml-auto text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1 font-light">
                LINK
              </span>
            ` : ''}

            </button>
          </li>
        `;
      });
      html += '</ul></div>';
      return html;
    }

    let html = '<ul class="space-y-1">';
    items.forEach((item, idx) => {
    if (item.type === "section") {
    const isSectionActive = activeSection === item.label && !activeFile;
    html += `
      <li>
      <button tabindex="0"
        type="button"
        class="cursor-pointer flex items-center justify-center mx-auto w-[95%] md:w-full gap-2 px-8 py-2.5 rounded-xl transition font-semibold focus:outline-none justify-start text-[#f1f1f1]
        ${isSectionActive ? 'border border-[#f1f1f1]/10 bg-white/5' : 'border border-transparent'}
        ${isSectionActive ? 'glassmorphism-active' : ''}"
        data-section="${item.label}">
        ${item.icon || ''}
        <span class="max-w-full block text-left break-words bg-transparent" title="${item.label}">
          ${highlightMatch(item.label)}
        </span>
      </button>
    </li>
  `;
}
 else if (item.type === "dropdown") {
        const dropdownId = `${parentId}dropdown-${idx}`;
        const isOpen = openDropdowns.includes(dropdownId);
        // Styling logic for each dropdown level
        let openClass = '', defaultClass = 'text-white hover:bg-white/5';
        let arrowColor = '#fff';
        if (level === 0) {
          openClass = 'border border-[#57BAA6]/10 bg-white/5 text-white';
          arrowColor = '#fff';
        } else if (level === 1) {
          openClass = 'text-[#0095CE]';
          arrowColor = '#0095CE';
        } else {
          openClass = 'text-[#48A9A6]';
          arrowColor = '#4DADA2';
        }
        html += `
          <li>
            <button type="button" tabindex="0"
              class="cursor-pointer flex items-center justify-center mx-auto w-[95%] md:w-full gap-2 px-8 py-2.5 rounded-xl transition font-semibold focus:outline-none justify-start ${isOpen ? openClass : defaultClass}"
              data-dropdown="${dropdownId}">
              ${item.icon || ''}
              <span class="block max-w-full text-left break-words" title="${item.label}">${highlightMatch(item.label)}</span>
              <svg class="w-5 h-5 max-w-[1.25rem] dropdown-arrow ml-auto shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}" width="1em" height="1em" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="${isOpen ? arrowColor : '#fff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div id="${dropdownId}" class="dropdown-content ${isOpen ? 'open' : 'hidden'} mt-2 ml-0 transition-all duration-300">
              ${item.children ? renderItems(item.children, dropdownId + '-', item.label, level + 1) : ''}
            </div>
          </li>
        `;
      } else if (item.type === "folder" || item.type === "file") {
        const fileKey = `${parentDropdownLabel || ''}/${item.label}`;
        const isActive = activeFile === fileKey;
        html += `
          <li>
            <button tabindex="0" class="cursor-pointer flex items-center w-full gap-3 px-8 py-3 rounded-lg text-white hover:text-[#F1CD6C] transition-all duration-200 group justify-start ${isActive ? 'text-[#F1CD6C] font-bold' : ''}"
              data-file="${item.label}" 
              data-filetype="${item.fileType || ''}" 
              data-url="${item.url || ''}" 
              data-templateid="${item.templateId ? item.templateId : ''}"
              data-parent="${parentDropdownLabel || ''}">
              <span class="max-w-full block font-medium text-left break-words ${isActive ? 'text-[#F1CD6C] font-bold' : ''}" title="${item.label}">${highlightMatch(item.label)}</span>
              ${item.fileType === 'pdf' ? `
                <span class="ml-auto text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  PDF
                </span>
              ` : ''}
            </button>
          </li>
        `;
      }
    });
    html += '</ul>';
    return html;
  }

  // Animation functions
function animateDropdownClose(element) {
    return new Promise(resolve => {
      if (!element || element.classList.contains('hidden')) {
        resolve();
        return;
      }
      const height = element.scrollHeight;
      element.style.height = height + 'px';
      element.style.overflow = 'hidden';
      element.style.transition = 'height 0.3s ease-out, opacity 0.2s ease-out';
      element.offsetHeight;
      element.style.height = '0px';
      element.style.opacity = '0';
      setTimeout(() => {
        element.classList.add('hidden');
        element.style.height = '';
        element.style.opacity = '';
        element.style.transition = '';
        element.style.overflow = '';
        resolve();
      }, 300);
    });
  }

function animateDropdownOpen(element) {
    if (!element || !element.classList.contains('hidden')) {
      return;
    }
    element.classList.remove('hidden');
    element.style.height = '0px';
    element.style.opacity = '0';
    element.style.overflow = 'hidden';
    element.style.transition = 'height 0.3s ease-out, opacity 0.2s ease-out';
    element.offsetHeight;
    const height = element.scrollHeight;
    element.style.height = height + 'px';
    element.style.opacity = '1';
    setTimeout(() => {
      element.style.height = '';
      element.style.opacity = '';
      element.style.transition = '';
      element.style.overflow = '';
    }, 300);
  }



function showContent(label, url, fileType, parentLabel = '', templateId = null) {
  console.log("showContent called with:", { label, fileType, url, parentLabel, templateId });
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

 
}



function collapseAllNestedDropdowns(rootDropdown) {
  const rootId = rootDropdown.id;
  
  
  if (searchQuery) {
    return;
  }

  openDropdowns = openDropdowns.filter(id => !id.startsWith(rootId + '-'));


  const openChildren = rootDropdown.querySelectorAll('.dropdown-content.open');

  openChildren.forEach(child => {
    child.classList.remove('open');
    child.style.maxHeight = null;
  });
}





const sidebar = document.getElementById("resizable-sidebar");
  const divider = document.getElementById("divider");

  let isDragging = false;

  divider.addEventListener("mousedown", () => {
    isDragging = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    // Get the sidebar's left position
    const sidebarLeft = sidebar.getBoundingClientRect().left;
    const newWidth = e.clientX - sidebarLeft;

    if (newWidth > 300 && newWidth < 500) {
      sidebar.style.width = `${newWidth}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    }
  });

  let lastScreenWidth = window.innerWidth;

window.addEventListener("resize", () => {
  const sidebar = document.querySelector("aside"); // Adjust if your sidebar uses a different selector
  const currentWidth = window.innerWidth;

  // If screen size crosses breakpoint from large to small or vice versa
  if ((lastScreenWidth >= 1280 && currentWidth < 1280) || (lastScreenWidth < 1280 && currentWidth >= 1280)) {
    sidebar.style.width = ""; // Resets to Tailwind class-controlled width
  }

  lastScreenWidth = currentWidth;
});



});



