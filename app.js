/**
 * DayPulse - Daily Work Schedule & Routine Board Controller
 * Fully Automatic Real-Time Scheduled Target Time Notification Engine
 */

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT token', e);
    return null;
  }
}

// Global Web Audio Context for synthesized notification sound chime
let audioCtx = null;
function playNotificationSound() {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 tone
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5 tone

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    }
  } catch (e) {
    console.log('Audio playback error', e);
  }
}

// Unlock Web Audio API context on first document user interaction
document.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}, { once: true });

document.addEventListener('DOMContentLoaded', () => {
  const state = window.dayPulseState;

  // View Containers
  const authScreenView = document.getElementById('authScreenView');
  const mainAppView = document.getElementById('mainAppView');
  const navAuthenticatedActions = document.getElementById('navAuthenticatedActions');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userAvatarText = document.getElementById('userAvatarText');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const btnSignOut = document.getElementById('btnSignOut');

  // Notification Bell & Dropdown Elements
  const btnNotificationBell = document.getElementById('btnNotificationBell');
  const notifBadgeCount = document.getElementById('notifBadgeCount');
  const notifDropdownMenu = document.getElementById('notifDropdownMenu');
  const notifDropdownList = document.getElementById('notifDropdownList');
  const btnClearNotifs = document.getElementById('btnClearNotifs');
  const btnTestNotifNow = document.getElementById('btnTestNotifNow');

  // Auth Tabs & Forms
  const tabAuthSignIn = document.getElementById('tabAuthSignIn');
  const tabAuthSignUp = document.getElementById('tabAuthSignUp');
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const passToggleBtns = document.querySelectorAll('.pass-toggle-btn');

  // Client ID Modal Elements
  const btnConfigClientId = document.getElementById('btnConfigClientId');
  const clientIdModal = document.getElementById('clientIdModal');
  const btnCloseClientIdModal = document.getElementById('btnCloseClientIdModal');
  const btnSaveClientId = document.getElementById('btnSaveClientId');
  const inputGoogleClientId = document.getElementById('inputGoogleClientId');

  // Reason Modal Elements
  const reasonModal = document.getElementById('reasonModal');
  const reasonForm = document.getElementById('reasonForm');
  const reasonTaskId = document.getElementById('reasonTaskId');
  const reasonTaskTitleText = document.getElementById('reasonTaskTitleText');
  const inputTaskReason = document.getElementById('inputTaskReason');
  const btnCloseReasonModal = document.getElementById('btnCloseReasonModal');
  const btnCancelReasonModal = document.getElementById('btnCancelReasonModal');

  // Dashboard DOM Elements
  const columnsGrid = document.getElementById('columnsGrid');
  const completedCountEl = document.getElementById('completedCount');
  const totalCountEl = document.getElementById('totalCount');
  const progressBarFill = document.getElementById('progressBarFill');
  const lastTimestampText = document.getElementById('lastTimestampText');
  const currentDateDisplay = document.getElementById('currentDateDisplay');

  // Simulation Banner Elements
  const simulationBanner = document.getElementById('simulationBanner');
  const simulatedDateText = document.getElementById('simulatedDateText');
  const btnSimulateNextDay = document.getElementById('btnSimulateNextDay');
  const btnResetSimDate = document.getElementById('btnResetSimDate');

  // View Navigation Tabs & Filters
  const tabBoardView = document.getElementById('tabBoardView');
  const tabHistoryView = document.getElementById('tabHistoryView');
  const boardViewSection = document.getElementById('boardViewSection');
  const historyViewSection = document.getElementById('historyViewSection');
  const historyLogsList = document.getElementById('historyLogsList');

  const filterLogsAll = document.getElementById('filterLogsAll');
  const filterLogsCompleted = document.getElementById('filterLogsCompleted');
  const filterLogsSkipped = document.getElementById('filterLogsSkipped');
  let currentLogFilter = 'all';

  // Task Modal Elements
  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const modalTitle = document.getElementById('modalTitle');
  const editTaskId = document.getElementById('editTaskId');
  const taskTitle = document.getElementById('taskTitle');
  const taskCategory = document.getElementById('taskCategory');
  const taskTargetTime = document.getElementById('taskTargetTime');
  const taskIcon = document.getElementById('taskIcon');
  const taskDescription = document.getElementById('taskDescription');
  const taskColor = document.getElementById('taskColor');
  const btnOpenAddTaskModal = document.getElementById('btnOpenAddTaskModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const colorDots = document.querySelectorAll('.color-dot');
  const toastContainer = document.getElementById('toastContainer');

  let activeGoogleClientId = localStorage.getItem('daypulse_google_client_id') || '789123456789-exampleclientid.apps.googleusercontent.com';
  inputGoogleClientId.value = activeGoogleClientId;

  // Automatically request Web Desktop Notification Permission
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  initGoogleIdentityServices();

  function initGoogleIdentityServices() {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: activeGoogleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      const container = document.getElementById('googleSignInButtonContainer');
      if (container) {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(
          container,
          { theme: 'filled_black', size: 'large', type: 'standard', shape: 'pill', text: 'continue_with', width: '320' }
        );
      }
    } else {
      setTimeout(initGoogleIdentityServices, 500);
    }
  }

  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;

    const payload = parseJwt(response.credential);
    if (payload) {
      const googleProfile = {
        name: payload.name || payload.given_name || 'Google User',
        email: payload.email,
        avatar: payload.picture,
        sub: payload.sub
      };

      const res = state.signInWithGoogle(googleProfile);
      if (res.success) {
        showToast(`Authentically signed in with Google as ${googleProfile.email}`, 'success');
        checkSessionState();
      }
    }
  }

  checkSessionState();

  function checkSessionState() {
    if (state.currentUser) {
      authScreenView.style.display = 'none';
      mainAppView.style.display = 'block';
      navAuthenticatedActions.style.display = 'flex';

      const name = state.currentUser.name || 'Developer';
      userNameDisplay.textContent = name;

      if (state.currentUser.avatar) {
        userAvatarImg.src = state.currentUser.avatar;
        userAvatarImg.style.display = 'block';
        userAvatarText.style.display = 'none';
      } else {
        userAvatarImg.style.display = 'none';
        userAvatarText.style.display = 'flex';
        userAvatarText.textContent = name.charAt(0).toUpperCase();
      }

      renderHeaderDate();
      renderBoard();
      renderHistory();
      renderNotifications();
    } else {
      authScreenView.style.display = 'flex';
      mainAppView.style.display = 'none';
      navAuthenticatedActions.style.display = 'none';
      simulationBanner.style.display = 'none';

      initGoogleIdentityServices();
    }
  }

  // FAST AUTOMATIC REAL-TIME BACKGROUND CHECKER (Runs continuously every 1 second)
  setInterval(runAutomaticBackgroundChecker, 1000);

  function runAutomaticBackgroundChecker() {
    if (!state.currentUser) return;

    // Check automatic daily status resets at midnight
    const resetRes = state.checkAndResetDailyStatus();
    if (resetRes.resetOccurred) {
      showToast(`Daily Routine Reset! Tasks reset to Pending for ${resetRes.currentDate}`, 'info');
      renderBoard();
      renderHeaderDate();
    }

    // Check target time notifications AUTOMATICALLY
    const newNotifs = state.checkPendingTaskNotifications();
    if (newNotifs.length > 0) {
      playNotificationSound();

      newNotifs.forEach(notif => {
        // Automatic Desktop Web Push Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Pending Work Reminder - DayPulse', {
            body: `Target time ${notif.targetTime} reached! Task "${notif.title}" is still pending.`,
            icon: 'favicon.ico'
          });
        }

        // Automatic In-App Alert Banner
        showToast(`🔔 AUTOMATIC ALERT (${notif.targetTime}): Task "${notif.title}" is unfinished!`, 'warning');
      });

      renderNotifications();
    }
  }

  function renderNotifications() {
    const notifs = state.activeNotifications;

    if (notifs.length > 0) {
      notifBadgeCount.style.display = 'flex';
      notifBadgeCount.textContent = notifs.length;
    } else {
      notifBadgeCount.style.display = 'none';
    }

    notifDropdownList.innerHTML = '';

    if (notifs.length === 0) {
      notifDropdownList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          <i class="fa-regular fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 0.4rem; color: var(--text-dim);"></i>
          <p>No active pending work notifications.</p>
        </div>
      `;
      return;
    }

    notifs.forEach(notif => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      item.innerHTML = `
        <div class="notif-item-title">
          <span><i class="fa-solid fa-clock" style="color: var(--pitch-black);"></i> ${escapeHtml(notif.title)}</span>
          <span class="notif-item-time">${notif.time}</span>
        </div>
        <div style="color: var(--text-muted); margin-top: 2px;">
          Scheduled for <strong>${escapeHtml(notif.targetTime)}</strong> - Unfinished
        </div>
        <div style="margin-top: 6px; display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary notif-complete-btn" data-id="${notif.taskId}" style="padding: 2px 8px; font-size: 0.75rem;">
            Mark Complete
          </button>
        </div>
      `;
      notifDropdownList.appendChild(item);
    });

    document.querySelectorAll('.notif-complete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-id');
        handleToggleTask(taskId);
        renderNotifications();
      });
    });
  }

  btnNotificationBell.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdownMenu.classList.toggle('active');

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  });

  document.addEventListener('click', (e) => {
    if (!notifDropdownMenu.contains(e.target) && e.target !== btnNotificationBell) {
      notifDropdownMenu.classList.remove('active');
    }
  });

  btnClearNotifs.addEventListener('click', () => {
    state.activeNotifications = [];
    renderNotifications();
  });

  btnTestNotifNow.addEventListener('click', () => {
    const pendingTasks = state.tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) {
      showToast('All tasks are completed! No pending tasks to trigger notification for.', 'info');
      return;
    }

    playNotificationSound();

    const targetTask = pendingTasks[0];
    const notif = {
      id: 'notif_test_' + Date.now(),
      taskId: targetTask.id,
      title: targetTask.title,
      targetTime: targetTask.targetTime,
      message: `TEST ALERT: Task "${targetTask.title}" is pending!`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    state.activeNotifications.unshift(notif);
    renderNotifications();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Pending Task Test Alert', {
        body: `Task "${targetTask.title}" (Scheduled ${targetTask.targetTime}) is pending!`,
        icon: 'favicon.ico'
      });
    }

    showToast(`🔔 Notification Alert triggered for "${targetTask.title}"!`, 'warning');
  });

  // Auth Tab Switchers
  tabAuthSignIn.addEventListener('click', () => {
    tabAuthSignIn.classList.add('active');
    tabAuthSignUp.classList.remove('active');
    signInForm.style.display = 'block';
    signUpForm.style.display = 'none';
  });

  tabAuthSignUp.addEventListener('click', () => {
    tabAuthSignUp.classList.add('active');
    tabAuthSignIn.classList.remove('active');
    signUpForm.style.display = 'block';
    signInForm.style.display = 'none';
  });

  passToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
      }
    });
  });

  signInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;

    const res = state.signIn(email, password);
    if (res.success) {
      showToast(`Welcome back, ${res.user.name}!`, 'success');
      checkSessionState();
    } else {
      const autoSignUpRes = state.signUp('Pro Developer', email, password);
      if (autoSignUpRes.success) {
        showToast(`Account created & logged in! Welcome to DayPulse.`, 'success');
        checkSessionState();
      } else {
        showToast(res.message, 'danger');
      }
    }
  });

  signUpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpName').value.trim();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value;

    const res = state.signUp(name, email, password);
    if (res.success) {
      showToast(`Account created successfully! Welcome, ${res.user.name}.`, 'success');
      checkSessionState();
    } else {
      showToast(res.message, 'danger');
    }
  });

  btnConfigClientId.addEventListener('click', () => {
    clientIdModal.classList.add('active');
  });

  btnCloseClientIdModal.addEventListener('click', () => {
    clientIdModal.classList.remove('active');
  });

  btnSaveClientId.addEventListener('click', () => {
    const newId = inputGoogleClientId.value.trim();
    if (newId) {
      activeGoogleClientId = newId;
      localStorage.setItem('daypulse_google_client_id', newId);
      clientIdModal.classList.remove('active');
      initGoogleIdentityServices();
      showToast('Google OAuth Client ID updated & re-initialized!', 'success');
    }
  });

  btnSignOut.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out?')) {
      state.signOut();
      if (window.google && window.google.accounts) {
        window.google.accounts.id.disableAutoSelect();
      }
      showToast('Signed out successfully.', 'info');
      checkSessionState();
    }
  });

  function renderHeaderDate() {
    const d = state.getSimulatedDate();
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = d.toLocaleDateString('en-US', options);

    if (state.simulatedOffset !== 0) {
      simulationBanner.style.display = 'flex';
      simulatedDateText.textContent = dateStr;
      currentDateDisplay.textContent = `${dateStr} (Simulated)`;
    } else {
      simulationBanner.style.display = 'none';
      currentDateDisplay.textContent = dateStr;
    }
  }

  function renderBoard() {
    columnsGrid.innerHTML = '';
    const tasks = state.tasks;

    let completed = 0;

    if (tasks.length === 0) {
      columnsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-square-plus"></i>
          <h3>No Routine Tasks Setup</h3>
          <p>You haven't set up any daily work tasks or columns yet. Click the button below to add your first column (e.g. "Meal", "Deep Work").</p>
          <button id="emptyStateAddBtn" class="btn btn-primary">
            <i class="fa-solid fa-plus"></i> Add First Task Column
          </button>
        </div>
      `;
      document.getElementById('emptyStateAddBtn')?.addEventListener('click', openAddTaskModal);
    } else {
      tasks.forEach(task => {
        if (task.status === 'completed') completed++;

        const isCompleted = task.status === 'completed';
        const isSkipped = task.status === 'skipped';
        
        const colCard = document.createElement('div');
        colCard.className = `task-column ${isCompleted ? 'completed' : isSkipped ? 'skipped' : ''}`;
        
        colCard.innerHTML = `
          <div>
            <div class="column-top-bar">
              <div class="task-header-left">
                <div class="task-icon-box">
                  <i class="fa-solid ${task.icon || 'fa-tasks'}"></i>
                </div>
                <div class="task-title-group">
                  <h3>${escapeHtml(task.title)}</h3>
                  <span class="task-category-tag">
                    ${escapeHtml(task.category)}
                  </span>
                </div>
              </div>

              <div class="task-actions-menu">
                <button class="icon-btn edit-task-btn" data-id="${task.id}" title="Edit Task Column">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="icon-btn delete-task-btn" data-id="${task.id}" title="Delete Task Column">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>

            <div class="task-details">
              <p>${escapeHtml(task.description || 'Daily recurring task.')}</p>
              <div class="task-target-time">
                <i class="fa-regular fa-clock"></i> Scheduled Target: <strong>${escapeHtml(task.targetTime)}</strong>
              </div>
            </div>

            <div>
              <span class="status-badge ${isCompleted ? 'completed' : isSkipped ? 'skipped' : 'pending'}">
                <i class="fa-solid ${isCompleted ? 'fa-circle-check' : isSkipped ? 'fa-circle-exclamation' : 'fa-hourglass-half'}"></i>
                ${isCompleted ? 'Completed' : isSkipped ? 'Skipped / Missed' : 'Pending'}
              </span>
            </div>
          </div>

          <div>
            <button class="btn-complete ${isCompleted ? 'completed-btn' : 'pending-btn'} toggle-status-btn" data-id="${task.id}">
              <i class="fa-solid ${isCompleted ? 'fa-rotate-left' : 'fa-check'}"></i>
              <span>${isCompleted ? 'Mark Pending' : 'Complete'}</span>
            </button>

            ${!isCompleted ? `
              <button class="btn-log-reason open-reason-btn" data-id="${task.id}" data-title="${escapeHtml(task.title)}" title="Log a note explaining why this work wasn't done today">
                <i class="fa-regular fa-note-sticky"></i>
                <span>${isSkipped ? 'Update Blocker Reason' : 'Log Reason / Blocker'}</span>
              </button>
            ` : ''}

            ${isCompleted && task.completedAt ? `
              <div class="completion-time-info">
                <span>Completed At:</span>
                <span class="completion-timestamp"><i class="fa-solid fa-clock"></i> ${task.completedTimeOnly || task.completedAt.split(' ')[1]}</span>
              </div>
            ` : ''}

            ${isSkipped && task.missedReason ? `
              <div class="reason-box-card">
                <strong><i class="fa-solid fa-comment-dots"></i> Reason Logged:</strong>
                <p style="margin-top: 2px;">"${escapeHtml(task.missedReason)}"</p>
              </div>
            ` : ''}
          </div>
        `;

        columnsGrid.appendChild(colCard);
      });
    }

    totalCountEl.textContent = tasks.length;
    completedCountEl.textContent = completed;
    const percentage = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    progressBarFill.style.width = `${percentage}%`;

    const lastLog = state.logs[0];
    if (lastLog) {
      lastTimestampText.textContent = lastLog.timeOnly;
    } else {
      lastTimestampText.textContent = '--:--:--';
    }

    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-id');
        handleToggleTask(taskId);
      });
    });

    document.querySelectorAll('.open-reason-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-id');
        const title = e.currentTarget.getAttribute('data-title');
        openReasonModal(taskId, title);
      });
    });

    document.querySelectorAll('.edit-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-id');
        openEditTaskModal(taskId);
      });
    });

    document.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.getAttribute('data-id');
        handleDeleteTask(taskId);
      });
    });
  }

  function handleToggleTask(taskId) {
    const updatedTask = state.toggleTaskStatus(taskId);
    if (!updatedTask) return;

    if (updatedTask.status === 'completed') {
      if (window.confetti) {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      showToast(`Task "${updatedTask.title}" marked Complete! Timestamp: ${updatedTask.completedTimeOnly}`, 'success');
    } else {
      showToast(`Task "${updatedTask.title}" status reset back to Pending.`, 'info');
    }

    renderBoard();
    renderHistory();
    renderNotifications();
  }

  function openReasonModal(taskId, title) {
    reasonTaskId.value = taskId;
    reasonTaskTitleText.textContent = title;
    
    const task = state.tasks.find(t => t.id === taskId);
    inputTaskReason.value = task && task.missedReason ? task.missedReason : '';
    
    reasonModal.classList.add('active');
  }

  function closeReasonModal() {
    reasonModal.classList.remove('active');
  }

  reasonForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskId = reasonTaskId.value;
    const reasonText = inputTaskReason.value.trim();

    if (!reasonText) return;

    const task = state.logMissedReason(taskId, reasonText);
    if (task) {
      showToast(`Reason archived for "${task.title}". Saved to historical logs.`, 'success');
    }

    closeReasonModal();
    renderBoard();
    renderHistory();
    renderNotifications();
  });

  filterLogsAll.addEventListener('click', () => setHistoryFilter('all'));
  filterLogsCompleted.addEventListener('click', () => setHistoryFilter('completed'));
  filterLogsSkipped.addEventListener('click', () => setHistoryFilter('skipped'));

  function setHistoryFilter(filterType) {
    currentLogFilter = filterType;
    filterLogsAll.classList.toggle('active', filterType === 'all');
    filterLogsCompleted.classList.toggle('active', filterType === 'completed');
    filterLogsSkipped.classList.toggle('active', filterType === 'skipped');
    renderHistory();
  }

  function renderHistory() {
    historyLogsList.innerHTML = '';
    let logs = state.logs;

    if (currentLogFilter === 'completed') {
      logs = logs.filter(l => l.type !== 'skipped' && !l.reason);
    } else if (currentLogFilter === 'skipped') {
      logs = logs.filter(l => l.type === 'skipped' || l.reason);
    }

    if (logs.length === 0) {
      historyLogsList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
          <i class="fa-solid fa-folder-open" style="font-size: 2.2rem; margin-bottom: 0.5rem; color: var(--text-dim);"></i>
          <p>No log records matching this filter yet.</p>
        </div>
      `;
      return;
    }

    logs.forEach(log => {
      const isSkipped = log.type === 'skipped' || Boolean(log.reason);
      const item = document.createElement('div');
      item.className = `history-item ${isSkipped ? 'skipped-item' : ''}`;
      
      item.innerHTML = `
        <div class="history-item-left" style="width: 100%;">
          <i class="fa-solid ${isSkipped ? 'fa-circle-exclamation' : 'fa-circle-check'}" style="color: ${isSkipped ? '#6c757d' : 'var(--pitch-black)'};"></i>
          <div style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <strong style="font-size: 0.95rem; color: var(--text-black);">${escapeHtml(log.taskTitle)}</strong>
              <div style="font-weight: 800; color: var(--text-black); font-size: 0.85rem;">
                <i class="fa-regular fa-clock"></i> ${log.timeOnly} (${log.dateStr})
              </div>
            </div>
            
            <div class="history-date" style="margin-top: 2px;">
              ${escapeHtml(log.category)} • Action: <strong>${isSkipped ? 'Skipped / Unfinished' : 'Completed'}</strong>
            </div>

            ${log.reason ? `
              <div style="margin-top: 6px; padding: 6px 10px; background: #e9ecef; border-left: 3px solid #000000; border-radius: 4px; font-size: 0.82rem; color: #212529;">
                <strong><i class="fa-solid fa-quote-left"></i> Reason for not finishing:</strong> "${escapeHtml(log.reason)}"
              </div>
            ` : ''}
          </div>
        </div>
      `;
      historyLogsList.appendChild(item);
    });
  }

  function openAddTaskModal() {
    modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle" style="color: var(--pitch-black);"></i> Add New Work Task Column';
    editTaskId.value = '';
    taskForm.reset();
    taskColor.value = '#000000';
    setSelectedColor('#000000');
    taskModal.classList.add('active');
  }

  function openEditTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: var(--pitch-black);"></i> Edit Task Column';
    editTaskId.value = task.id;
    taskTitle.value = task.title;
    taskCategory.value = task.category || 'Health';
    taskTargetTime.value = task.targetTime || '12:00 PM';
    taskIcon.value = task.icon || 'fa-tasks';
    taskDescription.value = task.description || '';
    taskColor.value = task.color || '#000000';
    setSelectedColor(task.color || '#000000');

    taskModal.classList.add('active');
  }

  function closeModal() {
    taskModal.classList.remove('active');
  }

  function handleDeleteTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (confirm(`Are you sure you want to delete the "${task.title}" task column?`)) {
      state.deleteTask(taskId);
      showToast(`Task column "${task.title}" deleted.`, 'info');
      renderBoard();
      renderHistory();
      renderNotifications();
    }
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      title: taskTitle.value.trim(),
      category: taskCategory.value,
      targetTime: taskTargetTime.value.trim(),
      icon: taskIcon.value,
      description: taskDescription.value.trim(),
      color: taskColor.value
    };

    if (editTaskId.value) {
      state.updateTask(editTaskId.value, data);
      showToast(`Task column "${data.title}" updated successfully.`, 'success');
    } else {
      state.addTask(data);
      showToast(`New task column "${data.title}" created.`, 'success');
    }

    closeModal();
    renderBoard();
  });

  colorDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const selectedColor = e.currentTarget.getAttribute('data-color');
      taskColor.value = selectedColor;
      setSelectedColor(selectedColor);
    });
  });

  function setSelectedColor(colorHex) {
    colorDots.forEach(dot => {
      if (dot.getAttribute('data-color') === colorHex) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });
  }

  btnSimulateNextDay.addEventListener('click', () => {
    const res = state.advanceSimulationDay(1);
    renderHeaderDate();
    renderBoard();
    renderHistory();
    renderNotifications();
    showToast(`Time traveled +1 day to ${res.currentDate}! Task statuses auto-reset to Pending.`, 'info');
  });

  btnResetSimDate.addEventListener('click', () => {
    const res = state.resetSimulationDate();
    renderHeaderDate();
    renderBoard();
    renderHistory();
    renderNotifications();
    showToast(`Reset time to Real Today (${res.currentDate}).`, 'info');
  });

  tabBoardView.addEventListener('click', () => {
    tabBoardView.classList.add('active');
    tabHistoryView.classList.remove('active');
    boardViewSection.style.display = 'block';
    historyViewSection.style.display = 'none';
  });

  tabHistoryView.addEventListener('click', () => {
    tabHistoryView.classList.add('active');
    tabBoardView.classList.remove('active');
    boardViewSection.style.display = 'none';
    historyViewSection.style.display = 'block';
    renderHistory();
  });

  btnOpenAddTaskModal.addEventListener('click', openAddTaskModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  btnCloseReasonModal.addEventListener('click', closeReasonModal);
  btnCancelReasonModal.addEventListener('click', closeReasonModal);

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
    if (e.target === clientIdModal) clientIdModal.classList.remove('active');
    if (e.target === reasonModal) closeReasonModal();
  });

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa-solid fa-circle-check" style="color: #ffffff;"></i>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
