(() => {
  'use strict';

  const STORAGE_KEY = 'daily-tasks-v1';
  const form = document.querySelector('#task-form');
  const input = document.querySelector('#task-input');
  const list = document.querySelector('#task-list');
  const emptyState = document.querySelector('#empty-state');
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const clearButton = document.querySelector('#clear-completed');
  const taskCount = document.querySelector('#task-count');
  const allCount = document.querySelector('#all-count');
  const activeCount = document.querySelector('#active-count');
  const completedCount = document.querySelector('#completed-count');
  const remainingText = document.querySelector('#remaining-text');
  const progressText = document.querySelector('#progress-text');
  const progressFill = document.querySelector('#progress-fill');
  const progressBar = document.querySelector('#progress-bar');
  const progressCaption = document.querySelector('#progress-caption');
  const dateLabel = document.querySelector('#today-date');

  let tasks = loadTasks();
  let currentFilter = 'all';

  function loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(task =>
        task && typeof task.id === 'string' &&
        typeof task.text === 'string' &&
        typeof task.completed === 'boolean'
      );
    } catch (error) {
      console.warn('할 일 데이터를 불러오지 못했습니다.', error);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error('할 일 저장에 실패했습니다.', error);
      return false;
    }
  }

  function makeIcon(name) {
    const paths = {
      check: '<path d="m5 12 4 4L19 6"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>'
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = paths[name];
    return svg;
  }

  function createTaskElement(task) {
    const item = document.createElement('li');
    item.className = 'task-item' + (task.completed ? ' done' : '');
    item.dataset.id = task.id;

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'check-button';
    check.setAttribute('aria-label', task.completed ? '완료 취소' : '할 일 완료 표시');
    check.setAttribute('aria-pressed', String(task.completed));
    if (task.completed) check.append(makeIcon('check'));
    check.addEventListener('click', () => toggleTask(task.id));

    const textWrap = document.createElement('div');
    textWrap.className = 'task-text';
    const text = document.createElement('span');
    text.textContent = task.text;
    textWrap.append(text);

    if (task.createdAt) {
      const date = document.createElement('time');
      date.className = 'task-date';
      date.dateTime = task.createdAt;
      const parsedDate = new Date(task.createdAt);
      date.textContent = Number.isNaN(parsedDate.getTime()) ? '' :
        parsedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' 추가';
      textWrap.append(date);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.setAttribute('aria-label', '할 일 삭제: ' + task.text);
    remove.append(makeIcon('trash'));
    remove.addEventListener('click', () => deleteTask(task.id));

    item.append(check, textWrap, remove);
    return item;
  }

  function render() {
    const completed = tasks.filter(task => task.completed).length;
    const active = tasks.length - completed;
    const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    taskCount.textContent = String(tasks.length);
    allCount.textContent = String(tasks.length);
    activeCount.textContent = String(active);
    completedCount.textContent = String(completed);
    remainingText.textContent = '남은 할 일 ' + active + '개';
    progressText.textContent = percent + '%';
    progressFill.style.width = percent + '%';
    progressBar.setAttribute('aria-valuenow', String(percent));
    progressCaption.textContent = tasks.length === 0
      ? '첫 번째 할 일을 추가해 보세요.'
      : active === 0 ? '멋져요! 모든 할 일을 완료했어요 🎉'
      : '총 ' + tasks.length + '개 중 ' + completed + '개를 완료했어요.';

    list.replaceChildren();
    const visibleTasks = tasks.filter(task =>
      currentFilter === 'all' ||
      (currentFilter === 'active' && !task.completed) ||
      (currentFilter === 'completed' && task.completed)
    );
    visibleTasks.forEach(task => list.append(createTaskElement(task)));

    emptyState.hidden = visibleTasks.length !== 0;
    if (tasks.length === 0) {
      emptyState.querySelector('h3').textContent = '아직 등록한 할 일이 없어요';
      emptyState.querySelector('p').textContent = '위 입력창에 오늘 할 일을 적어보세요.';
    } else if (visibleTasks.length === 0) {
      emptyState.querySelector('h3').textContent = currentFilter === 'active'
        ? '진행 중인 할 일이 없어요' : '완료한 할 일이 아직 없어요';
      emptyState.querySelector('p').textContent = '다른 필터를 선택하거나 새 할 일을 추가해 보세요.';
    }
    clearButton.disabled = completed === 0;
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function addTask(text) {
    tasks.unshift({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    });
    currentFilter = 'all';
    saveTasks();
    render();
  }

  function toggleTask(id) {
    tasks = tasks.map(task => task.id === id
      ? { ...task, completed: !task.completed } : task);
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    render();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    addTask(text);
    input.value = '';
    input.focus();
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      render();
    });
  });

  clearButton.addEventListener('click', () => {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
    render();
  });

  try {
    dateLabel.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  } catch (_) {
    dateLabel.textContent = '오늘도 좋은 하루 보내세요';
  }

  render();
})();