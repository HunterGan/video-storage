describe('Dashboard', () => {
  it('should render sidebar and header', () => {
    render(<Dashboard />);
    
    expect(screen.getByText(/AI Анализ изображений/i)).toBeInTheDocument();
    expect(screen.getByText(/перетащите изображения/i)).toBeInTheDocument();
  });

  it('should show prompt input with default value', () => {
    render(<Dashboard />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Default prompt');
  });

  it('should disable Go button when no images selected', () => {
    render(<Dashboard />);
    
    const goButton = screen.getByRole('button', { name: /анализ/i });
    expect(goButton).toBeDisabled();
  });

  it('should enable Go button after image selection', async () => {
    render(<Dashboard />);
    
    mockStore.images = [{
      id: 'test-1',
      file: new File(['test'], 'test.png', { type: 'image/png' }),
      preview: 'http://example.com/test.png',
      name: 'test.png',
      size: 1024,
    }];
    
    render(<Dashboard />);
    
    const goButton = screen.getByRole('button', { name: /анализ/i });
    expect(goButton).toBeEnabled();
  });

  it('should show loading state during analysis', async () => {
    vi.mock('../../../features/image-analysis/api', () => ({
      analyzeImage: vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ results: ['result'], combined: 'result' }), 100);
        });
      }),
    }));

    render(<Dashboard />);
    
    mockStore.images = [{
      id: 'test-1',
      file: new File(['test'], 'test.png', { type: 'image/png' }),
      preview: 'http://example.com/test.png',
      name: 'test.png',
      size: 1024,
    }];
    
    render(<Dashboard />);
    
    const goButton = screen.getByRole('button', { name: /анализ/i });
    await userEvent.click(goButton);
    
    await waitFor(() => {
      expect(screen.getByText(/обработка/i)).toBeInTheDocument();
    });
  });

  it('should display result after analysis', async () => {
    render(<Dashboard />);
    
    mockStore.images = [{
      id: 'test-1',
      file: new File(['test'], 'test.png', { type: 'image/png' }),
      preview: 'http://example.com/test.png',
      name: 'test.png',
      size: 1024,
    }];
    
    render(<Dashboard />);
    
    const goButton = screen.getByRole('button', { name: /анализ/i });
    await userEvent.click(goButton);
    
    await waitFor(() => {
      expect(screen.getByText(/результат анализа/i)).toBeInTheDocument();
    });
  });

  it('should switch tabs for result format', async () => {
    mockStore.result = 'Test result';
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/результат анализа/i)).toBeInTheDocument();
    });
    
    const jsonTab = screen.getByRole('tab', { name: /json/i });
    const yamlTab = screen.getByRole('tab', { name: /yaml/i });
    const htmlTab = screen.getByRole('tab', { name: /читаемый/i });
    
    expect(jsonTab).toBeInTheDocument();
    expect(yamlTab).toBeInTheDocument();
    expect(htmlTab).toBeInTheDocument();
    
    await userEvent.click(yamlTab);
    expect(yamlTab).toHaveAttribute('aria-selected', 'true');
    
    await userEvent.click(htmlTab);
    expect(htmlTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should copy result to clipboard', async () => {
    mockStore.result = 'Test result';
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/результат анализа/i)).toBeInTheDocument();
    });
    
    const copyButton = screen.getByRole('button', { name: /копия/i });
    await userEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText(/скопировано/i)).toBeInTheDocument();
    });
  });

  it('should show history items', async () => {
    mockStore.history = [{
      id: 'history-1',
      timestamp: Date.now(),
      prompt: 'Test prompt',
      imageCount: 1,
      result: 'Test result',
    }];
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/история запросов/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test prompt')).toBeInTheDocument();
  });

  it('should load result from history', async () => {
    mockStore.history = [{
      id: 'history-1',
      timestamp: Date.now(),
      prompt: 'History prompt',
      imageCount: 1,
      result: 'History result',
    }];
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/история запросов/i)).toBeInTheDocument();
    });
    
    const historyItem = screen.getByText('History prompt');
    await userEvent.click(historyItem);
    
    expect(mockStore.setPrompt).toHaveBeenCalledWith('History prompt');
    expect(mockStore.setResult).toHaveBeenCalledWith('History result');
  });

  it('should clear all data when clicking clear button', async () => {
    render(<Dashboard />);
    
    const clearButton = screen.getByRole('button', { name: /очистить/i });
    await userEvent.click(clearButton);
    
    expect(mockStore.reset).toHaveBeenCalled();
  });
});
