document.addEventListener('DOMContentLoaded', function () {
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

    // Handle SEI Header - only visible at very top
    if (currentScroll === 0) {
      seiNavbar.classList.remove("max-h-0");
      seiNavbar.classList.add("max-h-[1000px]");
    } else {
      seiNavbar.classList.add("max-h-0");
      seiNavbar.classList.remove("max-h-[1000px]");
    }

    // Handle Navbar - responds to scroll direction
    if (currentScroll <= 0) {
      navbar.classList.remove("-translate-y-full");
      lastScrollTop = 0;
      return;
    }

    if (currentScroll > lastScrollTop) {
      // Scrolling down - hide navbar
      navbar.classList.add("-translate-y-full");
    } else {
      // Scrolling up - show navbar
      navbar.classList.remove("-translate-y-full");
    }

    lastScrollTop = currentScroll;
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



  // Add popup functionality
  let popupHistory = false;

  function openPopup() {
    const popup = document.getElementById('mobile-template-popup');
    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (!popupHistory) {
      history.pushState({ popup: true }, '', window.location.href);
      popupHistory = true;
    }
  }

  function closePopup() {
    const popup = document.getElementById('mobile-template-popup');
    popup.classList.add('hidden');
    document.body.style.overflow = '';

    if (popupHistory) {
      popupHistory = false;
    }
  }

  // Close button event listener
  const closePopupBtn = document.getElementById('close-popup');
  if (closePopupBtn) {
    closePopupBtn.addEventListener('click', closePopup);
  }

  // Back button support
  window.addEventListener('popstate', (event) => {
    const popup = document.getElementById('mobile-template-popup');
    if (!popup.classList.contains('hidden')) {
      closePopup();
      history.pushState({ popup: false }, '', window.location.href);
    }
  });


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

      // ✅ Find the first template
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

          // ✅ Set the active file so it gets highlighted
          activeFile = `${defaultTemplate.parentLabel}/${defaultTemplate.label}`;
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

          // Wait a moment to allow DOM to render, then open dropdown smoothly
          setTimeout(() => {
            const dropdownEl = document.getElementById(parentId);
            if (dropdownEl) {
              collapseAllNestedDropdowns(dropdownEl); // optional if deeply nested
              animateDropdownOpen(dropdownEl);
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
        searchInput.addEventListener('input', function (e) {
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
      .toLowerCase().replace(/\s+/g, '-')
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

        // Debounce guard: ignore if recently clicked
        if (el.dataset.processing) return;

        el.dataset.processing = "true";
        setTimeout(() => {
          delete el.dataset.processing;
        }, 400); // Prevent another click for 400ms


        const dropdownId = focusedDropdown;
        const dropdownElement = document.getElementById(dropdownId);
        const isCurrentlyOpen = openDropdowns.includes(dropdownId);

        if (isCurrentlyOpen) {
          if (manuallyCollapsedDropdowns.includes(dropdownId)) { }

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
          const collapsedIndex = manuallyCollapsedDropdowns.indexOf(dropdownId);
          if (collapsedIndex !== -1) {
            manuallyCollapsedDropdowns.splice(collapsedIndex, 1); // remove it
          }

          const parentPath = dropdownId.substring(0, dropdownId.lastIndexOf('-'));
          const elementsToClose = openDropdowns
            .filter(id => {
              const idParentPath = id.substring(0, id.lastIndexOf('-'));
              return idParentPath === parentPath && !dropdownId.startsWith(id);
            })
            .map(id => document.getElementById(id))
            .filter(el => el);

          const closePromises = elementsToClose.map(el => animateDropdownClose(el));

          openDropdowns = openDropdowns.filter(id => {
            return (
              dropdownId === id ||
              dropdownId.startsWith(id + '-') ||
              id.startsWith(dropdownId + '-')
            );
          });

          openDropdowns.push(dropdownId);
          renderSidebar();
          setupSidebarListeners();
          setupSidebarKeyboardNavigation();

          const newDropdownElement = document.getElementById(dropdownId);
          if (newDropdownElement) {
            collapseAllNestedDropdowns(newDropdownElement);
            animateDropdownOpen(newDropdownElement);
          }
        }
      };
    });


    // File click
    sidebarMenu.querySelectorAll('[data-file]').forEach(el => {
      el.onclick = e => {
        const focusedLabel = el.getAttribute('data-file');
        const focusedParent = el.getAttribute('data-parent');


        e.preventDefault();
        const fileName = el.getAttribute('data-file');
        const fileUrl = el.getAttribute('data-url');
        const fileType = el.getAttribute('data-filetype');
        const parentName = el.getAttribute('data-parent');
        let templateId = el.getAttribute('data-templateid');


        // If it's a PDF file
        if (fileType === 'pdf') {
          if (window.innerWidth < 1024) {
            window.open(fileUrl, '_blank');
            return;
          }

        }
        // If it's a link (external URL), open directly on mobile
        if (fileType === 'link' && fileUrl && window.innerWidth < 1024) {
          window.open(fileUrl, '_blank');
          return;
        }

        if (fileType === 'template' && window.innerWidth < 1024) {
          const idToLoad = templateId || labelToId(fileName);
          const tmpl = document.getElementById(idToLoad);
          const content = document.getElementById('popup-content');
          if (tmpl && content) {
            content.innerHTML = tmpl.innerHTML;
            openPopup();
          } else {
            alert("Template not found or popup missing.");
          }



          return;
        }

        if (!fileType && url) {
          const ext = url.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image';
          else if (['mp4', 'webm'].includes(ext)) fileType = 'video';
          else if (ext === 'pdf') fileType = 'pdf';
        }



        activeFile = `${parentName || ''}/${fileName}`;
        activeSection = null;
        renderSidebar();
        setupSidebarListeners();
        setupSidebarKeyboardNavigation();
        showContent(fileName, fileUrl, fileType, parentName, templateId);

        // Restore focus to the same file button after re-render
        setTimeout(() => {
          const selector = `[data-file="${focusedLabel}"][data-parent="${focusedParent}"]`;
          const newBtn = document.querySelector(`#sidebar-menu-annual-report ${selector}`);
          if (newBtn) newBtn.focus();
        }, 0);

        // Restore scroll positions
        setTimeout(() => {
          Object.entries(scrollPositions).forEach(([id, scrollTop]) => {
            const div = document.getElementById(id);
            if (div) div.scrollTop = scrollTop;
          });
        }, 0);
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

        // Wait for the dropdown to expand and re-render before restoring nav
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
              <div class="timeline-star ${isActive ? 'star-active' : 'star-inactive'} flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="drop-shadow-lg rounded-full">
                  <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z"
                    stroke="${isActive ? '#F1CD6C' : '#6D5500'}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="${isActive ? '#F1CD6C' : '#6D5500'}"
                    fill-opacity="${isActive ? '0.4' : '0.1'}"
                  />
                </svg>
                ${isActive ? `<div class="rounded-full absolute inset-0 bg-[#F1CD6C] opacity-30 animate-ping scale-150"></div>` : ''}
              </div>
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
              <div class="timeline-star ${isActive ? 'star-active' : 'star-inactive'} flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="drop-shadow-lg rounded-full">
                  <path d="M12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12C7.97056 12 12 7.97056 12 3Z"
                    stroke="${isActive ? '#F1CD6C' : '#6D5500'}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="${isActive ? '#F1CD6C' : '#6D5500'}"
                    fill-opacity="${isActive ? '0.4' : '0.15'}"
                  />
                </svg>
                ${isActive ? `<div class="rounded-full absolute inset-0 bg-[#F1CD6C] opacity-30 animate-ping scale-150"></div>` : ''}
              </div>
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

  function findFirstPdf(data) {
    for (const item of data) {
      // Handle top-level PDF file
      if ((item.type === 'file' || !item.type) && item.fileType?.toLowerCase() === 'pdf') {
        return {
          label: item.label,
          url: item.url,
          fileType: item.fileType,
          parentLabel: ''
        };
      }

      // Handle PDF inside a dropdown
      if (item.type === 'dropdown' && Array.isArray(item.children)) {
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


  function showContent(label, url, fileType, parentLabel = '', templateId = null) {

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const main = document.getElementById('main-content-annual-report');
    main.style.transition = 'opacity 0.5s, transform 0.5s';
    main.style.opacity = '1';
    main.style.transform = 'translateY(0)';

    requestAnimationFrame(() => {
      main.style.opacity = '0';
      main.style.transform = 'translateY(20px)';
    });

    setTimeout(() => {
      main.innerHTML = '';

      if (!label || label.toLowerCase() === '') {
        const sectionItems = sidebarData['transparency'] || [];

        let fallbackFile = null;
        let parentLabel = '';

        // Find the first valid file (preferably PDF)
        for (const item of sectionItems) {
          if (item.type === 'file' && item.fileType === 'pdf') {
            fallbackFile = item;
            break;
          } else if (item.type === 'dropdown' && Array.isArray(item.children)) {
            const pdfChild = item.children.find(child => child.type === 'file' && child.fileType === 'pdf');
            if (pdfChild) {
              fallbackFile = pdfChild;
              parentLabel = item.label;
              break;
            }
          }
        }

        if (fallbackFile) {
          showContent(fallbackFile.label, fallbackFile.url, fallbackFile.fileType, parentLabel);
          return;
        } else {
          main.innerHTML = `<div class="text-red-500 p-4">No PDF available for preview.</div>`;
          return;
        }
      }

      else if (templateId) {
        const template = document.getElementById(templateId);
        if (template) {
          main.innerHTML = template.innerHTML;
        } else {
          main.innerHTML = `<div class="text-red-500 p-4">Template with ID "${templateId}" not found.</div>`;
        }
      }

      else if (fileType === "pdf" && url) {

        main.innerHTML = `
          <div class="main-content-wrapper mx-auto w-full px-2 sm:px-4 md:px-2">
            <div class="flex items-center justify-center gap-3 mb-6 lg:pl-4 sticky top-0 z-10 bg-[#030A17]/50 backdrop-blur-md  py-2">
              <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30 mt-1">
                <svg class="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
              <div class="flex-1 flex justify-between items-center mr-2">
                <div class="flex flex-col text-[10px]">
                  ${parentLabel ? `<span class="lg:text-lg xl:text-xl text-white/90 font-medium break-words">${parentLabel}</span>` : ""}
                  <span class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7CE68] via-[#57BAA6] to-[#125E85] leading-tight">
                    ${label}
                  </span>
                </div>
                <a href="${url}" download class="text-[#F1CD6C] hover:text-[#F7CE68] transition-colors flex-shrink-0 text-xs text-center items-center justify-center">
                  <svg class="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="none">
                    <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="#F1CD6C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="#F1CD6C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>Download Here
                </a>
              </div>
            </div>
            <div id="pdf-container-annual-report" class="bg-transparent backdrop-blur-md rounded-lg p-4 shadow-lg"></div>
          </div>
        `;
        const container = document.getElementById('pdf-container-annual-report');
        container.innerHTML = `
         <div class="flex flex-col items-center justify-center py-8 text-[#57BAA6]">
          <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-[#125E85]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"></path>
          </svg>
          <p class="mt-4 font-medium">Loading PDF...</p>
        </div>

        `;
        pdfjsLib.getDocument(url).promise
          .then(pdf => {

            container.innerHTML = "";
            const promises = [];
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              promises.push(
                pdf.getPage(pageNum).then(page => {


                  const containerWidth = container.offsetWidth || window.innerWidth;
                  const unscaledViewport = page.getViewport({ scale: 1.0 });

                  // Fit to container width in CSS pixels
                  const scale = (containerWidth / unscaledViewport.width);
                  const viewport = page.getViewport({ scale });

                  // Account for device pixel ratio 
                  const outputScale = window.devicePixelRatio || 1;

                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');

                  canvas.width = Math.floor(viewport.width * outputScale);
                  canvas.height = Math.floor(viewport.height * outputScale);

                  canvas.style.width = `100%`;
                  canvas.style.height = `100%`;
                  canvas.style.maxWidth = '100%';
                  canvas.style.maxHeight = 'none';


                  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

                  container.appendChild(canvas);

                  return page.render({ canvasContext: context, viewport });
                })
              );
            }
            promises.forEach(promise => {
              promise.then(() => {
                const canvasElements = container.querySelectorAll('canvas');
                canvasElements.forEach(canvas => {
                  canvas.style.marginBottom = '20px'; // Adjust the margin as needed
                });
              });
            });
            return Promise.all(promises);
          })
          .catch(error => {
            container.innerHTML = `
              <div class="text-center p-8 text-red-500">
                <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M6 3h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>

                <p class="font-bold">Failed to load PDF</p>
                <p class="text-sm mt-2">${error.message}</p>
                <a href="${url}" download class="mt-4 inline-block text-[#F1CD6C] hover:underline">
                  Download Instead
                </a>
              </div>
            `;
          });
      }

      else if (fileType === 'image') {
        const container = document.getElementById('main-content-annual-report');
        container.innerHTML = `
    <div class="w-full px-2 xl:px-12">
      <div class="flex items-start gap-3 mb-6 px-6">
        <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mt-1">
           <svg class="w-8 h-8 text-blue-300" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-9-6 2.03 2.71 2.72-3.63L19 17H5l4-5 2 2Z" fill="currentColor"/>
    </svg>
        </div>
        <div class="flex-1 flex justify-between items-center">
          <div class="flex flex-col">
            ${parentLabel ? `<span class="text-xl text-white/90 font-medium">${parentLabel}</span>` : ""}
            <span class="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F7CE68] via-[#57BAA6] to-[#125E85] leading-tight">
              ${label}
            </span>
          </div>
          <a href="${url}" download class="text-[#F1CD6C] hover:text-[#F7CE68] transition-colors flex-shrink-0">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="#F1CD6C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="#F1CD6C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
      <div class="rounded-lg p-4 text-center bg-transparent">
        <img src="${url}" alt="${label}" class="rounded-sm max-w-full mx-auto shadow-lg border border-white/10"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="hidden text-red-500 mt-6">
           <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-9-6 2.03 2.71 2.72-3.63L19 17H5l4-5 2 2Z" fill="currentColor"/>
    </svg>
          <p class="font-bold">Failed to load image</p>
          <a href="${url}" download class="mt-4 inline-block text-[#F1CD6C] hover:underline">
            Download Instead
          </a>
        </div>
      </div>
    </div>
  `;
      }

      else if (fileType === "link" && url) {
        main.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[40vh]">
          <div class="bg-white/10 rounded-xl p-8 shadow-lg text-center max-w-lg mx-auto">
            <div class="mb-4">
              <svg class="w-12 h-12 mx-auto text-[#57BAA6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-width="2" d="M13.828 14.828a4 4 0 1 1-5.656-5.656m6.364-6.364a9 9 0 1 1-12.728 12.728 9 9 0 0 1 12.728-12.728z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-2">${label}</h2>
            <p class="text-white/70 mb-4">This is an external link. Click below to open it in a new tab.</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer"
               class="inline-block px-6 py-2 rounded-lg bg-[#57BAA6] text-white font-semibold hover:bg-[#125E85] transition">
              Open Link
            </a>
          </div>
        </div>
      `;
      }

      else {
        console.warn("No matching condition for fileType:", fileType);
        main.innerHTML = `<div class="text-yellow-500 p-4">Unsupported or missing file type: ${fileType}</div>`;
      }


      requestAnimationFrame(() => {
        main.style.opacity = '1';
        main.style.transform = 'translateY(0)';
      });
    }, 500);


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


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.activeElement.tagName === 'INPUT') return;

      activeSection = null;
      activeFile = null;
      openDropdowns = [];
      renderSidebar();
      setupSidebarListeners();
      setupSidebarKeyboardNavigation();

      // Load the first available PDF file from JSON
      let fallbackFile = null;
      let parentLabel = '';

      for (const item of sidebarData) {
        if (item.type === 'file' && item.fileType === 'pdf') {
          fallbackFile = item;
          break;
        } else if (item.type === 'dropdown' && Array.isArray(item.children)) {
          const pdfChild = item.children.find(child => child.type === 'file' && child.fileType === 'pdf');
          if (pdfChild) {
            fallbackFile = pdfChild;
            parentLabel = item.label;
            break;
          }
        }
      }

      if (fallbackFile) {
        showContent(
          fallbackFile.label,
          fallbackFile.url,
          fallbackFile.fileType,
          parentLabel
        );
      } else {
        document.getElementById('main-content-annual-report').innerHTML =
          `<div class="text-red-500 p-4">No default PDF available.</div>`;
      }

      const searchInput = document.getElementById('sidebar-search-annual-report');
      if (searchInput) searchInput.blur();
    }
  });



  function showPopupFromTemplate(templateId) {
    const template = document.getElementById(templateId);
    const popup = document.getElementById('mobile-template-popup');
    const popupContent = document.getElementById('popup-content');

    if (template && 'content' in template) {
      const clone = template.content.cloneNode(true);
      popupContent.innerHTML = '';
      popupContent.appendChild(clone);

      popup.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    } else {
    }
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


  const mobilePopup = document.getElementById('mobile-template-popup');

  if (closePopupBtn && mobilePopup) {
    closePopupBtn.addEventListener('click', () => {
      mobilePopup.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

});



