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

  const viewDataButton = document.querySelector('#view-data');
  const savedDataPanel = document.querySelector('#saved-data-panel');
  const savedDataSummary = document.querySelector('#saved-data-summary');
  const savedDataContent = document.querySelector('#saved-data-content');
  const exportDataButton = document.querySelector('#export-data');
  const importDataButton = document.querySelector('#import-data-button');
  const importDataFile = document.querySelector('#import-data-file');
  const dataStatus = document.querySelector('#data-status');

  function createBackupData() {
    return {
      format: 'daily-tasks-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks
    };
  }

  function showSavedData() {
    const isOpen = !savedDataPanel.hidden;
    savedDataPanel.hidden = isOpen;
    viewDataButton.setAttribute('aria-expanded', String(!isOpen));
    viewDataButton.textContent = isOpen ? '저장 데이터 보기' : '저장 데이터 숨기기';
    if (!isOpen) {
      savedDataSummary.textContent = '총 ' + tasks.length + '개 · 완료 ' +
        tasks.filter(task => task.completed).length + '개 · 진행 중 ' +
        tasks.filter(task => !task.completed).length + '개';
      savedDataContent.textContent = JSON.stringify(createBackupData(), null, 2);
    }
  }

  function exportBackup() {
    try {
      const blob = new Blob([JSON.stringify(createBackupData(), null, 2)], {
        type: 'application/json;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = 'daily-tasks-backup-' + date + '.json';
      link.style.display = 'none';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      dataStatus.textContent = '백업 파일을 만들었어요. 다운로드 항목 또는 파일 앱을 확인해 주세요.';
    } catch (error) {
      console.error('백업 파일 생성에 실패했습니다.', error);
      dataStatus.textContent = '백업 파일을 만들지 못했어요. 다시 시도해 주세요.';
    }
  }

  function normalizeImportedTasks(value) {
    const imported = Array.isArray(value) ? value :
      value && value.format === 'daily-tasks-backup' && Array.isArray(value.tasks)
        ? value.tasks : null;
    if (!imported) throw new Error('파일 형식이 올바르지 않습니다. 이 앱에서 내보낸 JSON 백업 파일을 선택해 주세요.');
    if (imported.length > 10000) throw new Error('할 일이 너무 많아 불러올 수 없습니다.');
    const valid = imported.every(task => task &&
      typeof task.text === 'string' && task.text.trim().length > 0 &&
      typeof task.completed === 'boolean');
    if (!valid) throw new Error('백업 안의 할 일 데이터가 올바르지 않습니다. 현재 데이터는 변경하지 않았어요.');
    return imported.map(task => ({
      id: typeof task.id === 'string' && task.id
        ? task.id
        : (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2)),
      text: task.text.trim().slice(0, 160),
      completed: task.completed,
      ...(typeof task.createdAt === 'string' ? { createdAt: task.createdAt } : {})
    }));
  }

  viewDataButton.addEventListener('click', showSavedData);
  exportDataButton.addEventListener('click', exportBackup);
  importDataButton.addEventListener('click', () => {
    importDataFile.value = '';
    importDataFile.click();
  });

  importDataFile.addEventListener('change', async () => {
    const file = importDataFile.files && importDataFile.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const importedTasks = normalizeImportedTasks(parsed);
      if (!window.confirm('현재 할 일 ' + tasks.length + '개를 백업 파일의 ' +
        importedTasks.length + '개로 바꿀까요? 기존 목록은 백업 파일 내용으로 교체됩니다.')) {
        dataStatus.textContent = '불러오기를 취소했어요. 기존 데이터는 그대로예요.';
        return;
      }
      const previousTasks = tasks;
      tasks = importedTasks;
      if (!saveTasks()) {
        tasks = previousTasks;
        dataStatus.textContent = '기기에 저장하지 못했어요. 저장 공간을 확인해 주세요. 기존 목록은 화면에 유지됩니다.';
        return;
      }
      currentFilter = 'all';
      render();
      if (!savedDataPanel.hidden) {
        savedDataSummary.textContent = '총 ' + tasks.length + '개 · 완료 ' +
          tasks.filter(task => task.completed).length + '개 · 진행 중 ' +
          tasks.filter(task => !task.completed).length + '개';
        savedDataContent.textContent = JSON.stringify(createBackupData(), null, 2);
      }
      dataStatus.textContent = '백업에서 할 일 ' + tasks.length + '개를 불러왔어요.';
    } catch (error) {
      console.error('백업 불러오기에 실패했습니다.', error);
      dataStatus.textContent = error instanceof SyntaxError
        ? 'JSON 파일을 읽을 수 없어요. 올바른 백업 파일인지 확인해 주세요.'
        : (error.message || '백업 파일을 불러오지 못했어요.');
    }
  });

  render();
})();