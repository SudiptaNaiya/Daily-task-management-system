/**
 * DayPulse - Daily Work Schedule & Routine Tracker
 * State Manager with Fully Automatic Target Time Background Notification Engine
 */

class DayPulseState {
  constructor() {
    this.STORAGE_KEYS = {
      CURRENT_USER: 'daypulse_current_user_v3',
      USERS_DB: 'daypulse_registered_users_v3',
      SIM_OFFSET: 'daypulse_sim_offset_v3',
      LAST_DATE: 'daypulse_last_active_date_v3',
      NOTIFIED_MAP: 'daypulse_notified_tasks_v3'
    };

    this.simulatedOffset = parseInt(localStorage.getItem(this.STORAGE_KEYS.SIM_OFFSET) || '0', 10);
    this.currentUser = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER)) || null;
    this.usersDb = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USERS_DB)) || [];
    
    this.tasks = [];
    this.logs = [];
    this.activeNotifications = [];
    this.notifiedTaskKeys = new Set(JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFIED_MAP) || '[]'));

    if (this.currentUser) {
      this.loadUserTasks();
      this.loadUserLogs();
      this.checkAndResetDailyStatus();
    }
  }

  getSimulatedDate() {
    const d = new Date();
    d.setDate(d.getDate() + this.simulatedOffset);
    return d;
  }

  getSimulatedDateString() {
    const d = this.getSimulatedDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getFormattedTimestamp() {
    const d = this.getSimulatedDate();
    const nowReal = new Date();
    d.setHours(nowReal.getHours(), nowReal.getMinutes(), nowReal.getSeconds());
    
    const datePart = this.getSimulatedDateString();
    const timePart = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      full: `${datePart} ${timePart}`,
      timeOnly: timePart,
      dateOnly: datePart,
      rawISO: d.toISOString()
    };
  }

  signIn(email, password) {
    const user = this.usersDb.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }

    this.currentUser = { id: user.id, name: user.name, email: user.email, provider: 'email' };
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    
    this.loadUserTasks();
    this.loadUserLogs();
    this.checkAndResetDailyStatus();

    return { success: true, user: this.currentUser };
  }

  signUp(name, email, password) {
    const exists = this.usersDb.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      createdAt: new Date().toISOString()
    };

    this.usersDb.push(newUser);
    localStorage.setItem(this.STORAGE_KEYS.USERS_DB, JSON.stringify(this.usersDb));

    return this.signIn(email, password);
  }

  signInWithGoogle(googleProfile) {
    let user = this.usersDb.find(u => u.email.toLowerCase() === googleProfile.email.toLowerCase());
    
    if (!user) {
      user = {
        id: 'usr_g_' + Date.now(),
        name: googleProfile.name,
        email: googleProfile.email.toLowerCase(),
        avatar: googleProfile.avatar,
        provider: 'google',
        createdAt: new Date().toISOString()
      };
      this.usersDb.push(user);
      localStorage.setItem(this.STORAGE_KEYS.USERS_DB, JSON.stringify(this.usersDb));
    }

    this.currentUser = { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      avatar: googleProfile.avatar || null,
      provider: 'google' 
    };
    
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    
    this.loadUserTasks();
    this.loadUserLogs();
    this.checkAndResetDailyStatus();

    return { success: true, user: this.currentUser };
  }

  signOut() {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    this.tasks = [];
    this.logs = [];
    this.activeNotifications = [];
    this.notifiedTaskKeys.clear();
    localStorage.removeItem(this.STORAGE_KEYS.NOTIFIED_MAP);
  }

  getUserTasksKey() {
    return `daypulse_tasks_${this.currentUser ? this.currentUser.id : 'guest'}`;
  }

  getUserLogsKey() {
    return `daypulse_logs_${this.currentUser ? this.currentUser.id : 'guest'}`;
  }

  getDefaultTasks() {
    return [
      {
        id: 'task_meal_breakfast',
        title: 'Morning Breakfast & Meal',
        category: 'Health',
        icon: 'fa-utensils',
        color: '#000000',
        targetTime: '08:30 AM',
        description: 'Nutritional breakfast, hydration, and vitamin supplements.',
        status: 'pending',
        completedAt: null,
        missedReason: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_deep_work',
        title: 'Deep Work Session',
        category: 'Work',
        icon: 'fa-laptop-code',
        color: '#000000',
        targetTime: '09:30 AM',
        description: 'High-priority core coding and architecture development.',
        status: 'pending',
        completedAt: null,
        missedReason: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_meal_lunch',
        title: 'Lunch & Screen Break',
        category: 'Health',
        icon: 'fa-bowl-food',
        color: '#000000',
        targetTime: '01:30 PM',
        description: 'Balanced meal and step away from laptop display.',
        status: 'pending',
        completedAt: null,
        missedReason: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_workout',
        title: 'Daily Workout / Gym',
        category: 'Fitness',
        icon: 'fa-dumbbell',
        color: '#000000',
        targetTime: '05:30 PM',
        description: '30 to 45 mins strength training or cardio session.',
        status: 'pending',
        completedAt: null,
        missedReason: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task_daily_review',
        title: 'Evening Standup & Plan',
        category: 'Personal',
        icon: 'fa-clipboard-check',
        color: '#000000',
        targetTime: '07:30 PM',
        description: 'Review completed items, log notes, and prep tomorrow board.',
        status: 'pending',
        completedAt: null,
        missedReason: null,
        createdAt: new Date().toISOString()
      }
    ];
  }

  loadUserTasks() {
    const key = this.getUserTasksKey();
    const data = localStorage.getItem(key);
    if (data) {
      try {
        this.tasks = JSON.parse(data);
      } catch (e) {
        this.tasks = this.getDefaultTasks();
      }
    } else {
      this.tasks = this.getDefaultTasks();
      this.saveUserTasks();
    }
  }

  saveUserTasks() {
    if (!this.currentUser) return;
    localStorage.setItem(this.getUserTasksKey(), JSON.stringify(this.tasks));
  }

  loadUserLogs() {
    const key = this.getUserLogsKey();
    const data = localStorage.getItem(key);
    if (data) {
      try {
        this.logs = JSON.parse(data);
      } catch (e) {
        this.logs = [];
      }
    } else {
      this.logs = [];
    }
  }

  saveUserLogs() {
    if (!this.currentUser) return;
    localStorage.setItem(this.getUserLogsKey(), JSON.stringify(this.logs));
  }

  checkAndResetDailyStatus() {
    if (!this.currentUser) return { resetOccurred: false };

    const currentDateStr = this.getSimulatedDateString();
    const userLastDateKey = `${this.STORAGE_KEYS.LAST_DATE}_${this.currentUser.id}`;
    const lastActiveDateStr = localStorage.getItem(userLastDateKey);

    if (lastActiveDateStr !== currentDateStr) {
      let resetCount = 0;
      this.tasks.forEach(task => {
        if (task.status === 'completed' || task.status === 'skipped') {
          task.status = 'pending';
          task.completedAt = null;
          task.missedReason = null;
          resetCount++;
        }
      });

      this.notifiedTaskKeys.clear();
      localStorage.removeItem(this.STORAGE_KEYS.NOTIFIED_MAP);
      this.activeNotifications = [];
      
      localStorage.setItem(userLastDateKey, currentDateStr);
      this.saveUserTasks();
      return { resetOccurred: true, lastDate: lastActiveDateStr, currentDate: currentDateStr, resetCount };
    }

    return { resetOccurred: false, currentDate: currentDateStr };
  }

  toggleTaskStatus(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const timestampData = this.getFormattedTimestamp();

    if (task.status === 'pending' || task.status === 'skipped') {
      task.status = 'completed';
      task.completedAt = timestampData.full;
      task.completedTimeOnly = timestampData.timeOnly;
      task.missedReason = null;

      // Remove from active pending notification list
      this.activeNotifications = this.activeNotifications.filter(n => n.taskId !== taskId);

      const logEntry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        taskId: task.id,
        taskTitle: task.title,
        category: task.category,
        type: 'completed',
        dateStr: timestampData.dateOnly,
        timestamp: timestampData.full,
        timeOnly: timestampData.timeOnly,
        reason: null
      };

      this.logs.unshift(logEntry);
      this.saveUserLogs();
    } else {
      task.status = 'pending';
      task.completedAt = null;
      task.completedTimeOnly = null;
      task.missedReason = null;
    }

    this.saveUserTasks();
    return task;
  }

  logMissedReason(taskId, reasonText) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const timestampData = this.getFormattedTimestamp();

    task.status = 'skipped';
    task.completedAt = null;
    task.missedReason = reasonText.trim();

    this.activeNotifications = this.activeNotifications.filter(n => n.taskId !== taskId);

    const logEntry = {
      id: 'log_reason_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      type: 'skipped',
      dateStr: timestampData.dateOnly,
      timestamp: timestampData.full,
      timeOnly: timestampData.timeOnly,
      reason: reasonText.trim()
    };

    this.logs.unshift(logEntry);
    this.saveUserLogs();
    this.saveUserTasks();

    return task;
  }

  parseTargetTimeToMinutes(timeStr) {
    if (!timeStr) return null;

    const str = timeStr.trim().toUpperCase();
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');

    let clean = str.replace('AM', '').replace('PM', '').trim();
    const parts = clean.split(':');

    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      let minutes = parseInt(parts[1], 10);

      if (isNaN(hours) || isNaN(minutes)) return null;

      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;

      return hours * 60 + minutes;
    }

    return null;
  }

  // AUTOMATIC REAL-TIME BACKGROUND CHECKER
  checkPendingTaskNotifications() {
    if (!this.currentUser) return [];

    const nowReal = new Date();
    const currentMinutes = nowReal.getHours() * 60 + nowReal.getMinutes();
    const todayStr = this.getSimulatedDateString();
    const newNotifications = [];

    this.tasks.forEach(task => {
      // RULE: AUTOMATICALLY NOTIFY ONLY IF TASK IS UNFINISHED (PENDING)
      if (task.status === 'pending') {
        const targetMinutes = this.parseTargetTimeToMinutes(task.targetTime);
        const notifyKey = `${todayStr}_${task.id}_${targetMinutes}`;

        // If current time reaches or passes scheduled target time, and hasn't been automatically notified today
        if (targetMinutes !== null && currentMinutes >= targetMinutes && !this.notifiedTaskKeys.has(notifyKey)) {
          this.notifiedTaskKeys.add(notifyKey);
          localStorage.setItem(this.STORAGE_KEYS.NOTIFIED_MAP, JSON.stringify(Array.from(this.notifiedTaskKeys)));

          const notif = {
            id: 'notif_auto_' + Date.now() + '_' + task.id,
            taskId: task.id,
            title: task.title,
            targetTime: task.targetTime,
            message: `AUTOMATIC REMINDER: Task "${task.title}" was scheduled for ${task.targetTime} and is still pending!`,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          };

          this.activeNotifications.unshift(notif);
          newNotifications.push(notif);
        }
      }
    });

    return newNotifications;
  }

  addTask(newTaskData) {
    const task = {
      id: 'task_' + Date.now(),
      title: newTaskData.title || 'Untitled Task',
      category: newTaskData.category || 'General',
      icon: newTaskData.icon || 'fa-tasks',
      color: newTaskData.color || '#000000',
      targetTime: newTaskData.targetTime || '12:00 PM',
      description: newTaskData.description || '',
      status: 'pending',
      completedAt: null,
      missedReason: null,
      createdAt: new Date().toISOString()
    };

    this.tasks.push(task);
    this.saveUserTasks();
    return task;
  }

  updateTask(taskId, updatedData) {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.tasks[index] = {
        ...this.tasks[index],
        ...updatedData
      };
      this.saveUserTasks();
      return this.tasks[index];
    }
    return null;
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveUserTasks();
  }

  advanceSimulationDay(days = 1) {
    this.simulatedOffset += days;
    localStorage.setItem(this.STORAGE_KEYS.SIM_OFFSET, this.simulatedOffset.toString());
    return this.checkAndResetDailyStatus();
  }

  resetSimulationDate() {
    this.simulatedOffset = 0;
    localStorage.setItem(this.STORAGE_KEYS.SIM_OFFSET, '0');
    return this.checkAndResetDailyStatus();
  }
}

window.dayPulseState = new DayPulseState();
