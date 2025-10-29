const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { JSDOM } = require('jsdom');

class BlockGraphBuilder {
  constructor() {
    this.blocks = [];
    this.nodes = [];
    this.links = [];
  }

  /**
   * Рекурсивно находит все .block-definition.yml файлы
   */
  async findBlockDefinitionFiles(dirPath) {
    const files = [];
    
    async function scanDirectory(currentPath) {
      try {
        const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item.name);
          
          if (item.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (item.isFile() && item.name === '.block-definition.yml') {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Не удалось прочитать директорию: ${currentPath}`, error.message);
      }
    }
    
    await scanDirectory(dirPath);
    return files;
  }

  /**
   * Парсит YAML файл и извлекает данные блока
   */
  parseBlockDefinition(filePath, content) {
    try {
      const data = yaml.load(content);
      const dirName = path.dirname(filePath);
      
      return {
        filePath,
        directory: dirName,
        name: data.name || 'Unknown',
        part: typeof data.part === 'string' 
          ? data.part.split(',').map(p => p.trim()).filter(p => p)
          : data.part || [],
        description: data.description || '',
        ignore: data.ignore || false
      };
    } catch (error) {
      console.warn(`Ошибка парсинга файла ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Строит граф из найденных блоков
   */
  buildGraph(blocks) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    let nodeId = 0;

    // Создаем узлы для каждого уникального сегмента part
    blocks.forEach(block => {
      if (block.ignore) return;

      const parts = block.part;
      
      // Создаем узлы для каждого сегмента в пути
      for (let i = 0; i < parts.length; i++) {
        const segmentPath = parts.slice(0, i + 1).join(' → ');
        const segmentName = parts[i];
        
        if (!nodeMap.has(segmentPath)) {
          const node = {
            id: nodeId++,
            name: segmentName,
            path: segmentPath,
            depth: i,
            isLeaf: i === parts.length - 1,
            blocks: []
          };
          
          nodeMap.set(segmentPath, node);
          nodes.push(node);
        }

        // Если это конечный узел (блок), добавляем информацию о блоке
        if (i === parts.length - 1) {
          const node = nodeMap.get(segmentPath);
          node.blocks.push({
            name: block.name,
            description: block.description,
            directory: block.directory
          });
        }
      }

      // Создаем связи между узлами
      for (let i = 1; i < parts.length; i++) {
        const sourcePath = parts.slice(0, i).join(' → ');
        const targetPath = parts.slice(0, i + 1).join(' → ');
        
        const sourceNode = nodeMap.get(sourcePath);
        const targetNode = nodeMap.get(targetPath);
        
        if (sourceNode && targetNode) {
          const linkExists = links.some(link => 
            link.source === sourceNode.id && link.target === targetNode.id
          );
          
          if (!linkExists) {
            links.push({
              source: sourceNode.id,
              target: targetNode.id
            });
          }
        }
      }
    });

    return { nodes, links };
  }

  /**
   * Генерирует SVG диаграмму с использованием d3
   */
  generateSVGGraph(nodes, links, width = 800, height = 600) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.document = dom.window.document;
    
    // Имитируем d3 для серверного рендеринга
    // В реальном браузерном окружении будет использоваться настоящая d3
    const d3 = {
      select: () => ({
        append: () => ({
          attr: () => ({ style: () => ({}) }),
          selectAll: () => ({
            data: () => ({
              enter: () => ({
                append: () => ({
                  attr: () => ({ style: () => ({}) }),
                  text: () => ({})
                })
              })
            })
          })
        })
      })
    };

    // В реальной реализации здесь будет код d3 для создания дерева
    // Это упрощенная версия для демонстрации структуры
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .node circle { fill: #fff; stroke: steelblue; stroke-width: 3px; }
            .node text { font: 12px sans-serif; }
            .link { fill: none; stroke: #ccc; stroke-width: 2px; }
            .node:hover circle { stroke: #ff7f0e; stroke-width: 4px; }
          </style>
        </defs>
        <g transform="translate(${width/2},${height/2})">
          ${links.map(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (!source || !target) return '';
            return `<line class="link" x1="${source.x || 0}" y1="${source.y || 0}" x2="${target.x || 100}" y2="${target.y || 100}" />`;
          }).join('')}
          ${nodes.map(node => `
            <g class="node" transform="translate(${node.x || 0},${node.y || 0})">
              <circle r="${node.isLeaf ? 8 : 6}" />
              <text dy="${node.isLeaf ? 15 : 12}" text-anchor="middle">${node.name}</text>
            </g>
          `).join('')}
        </g>
      </svg>
    `;

    return svg;
  }

  /**
   * Генерирует HTML страницу с интерактивной диаграммой
   */
  generateInteractiveGraph(nodes, links, width = 1400, height = 1000) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Блоки КПИ</title>
        <script src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>
        <style>
          * {
            box-sizing: border-box;
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            background: #f8f9fa; 
            height: 100vh;
            overflow: hidden;
          }
          .header { 
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: white; 
            padding: 15px 20px; 
            border-radius: 0 0 8px 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            transition: transform 0.3s ease;
            transform: translateY(0);
          }
          .header.collapsed {
            transform: translateY(calc(-100% + 0px));
          }
          .header-toggle {
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 40px;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 8px 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1001;
          }
          .header-toggle:hover {
            background: #f5f5f5;
          }
          .toggle-icon {
            transition: transform 0.3s ease;
          }
          .header.collapsed .toggle-icon {
            transform: rotate(180deg);
          }
          #graph-container { 
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
          }
          .node circle { 
            fill: #fff; 
            stroke: steelblue; 
            stroke-width: 2px; 
            transition: all 0.3s ease;
          }
          .node text { 
            font: 11px sans-serif; 
            pointer-events: none; 
            font-weight: 500;
          }
          .link { 
            fill: none; 
            stroke: #e0e0e0; 
            stroke-width: 1.5px;
            transition: all 0.3s ease;
          }
          .node:hover circle { 
            stroke: #ff6b35; 
            stroke-width: 3px; 
            filter: drop-shadow(0 0 8px rgba(255,107,53,0.4));
          }
          .node:hover ~ .link { 
            stroke: #ff6b35;
            stroke-width: 2px;
          }
          .tooltip { 
            position: absolute; 
            padding: 12px 15px; 
            background: rgba(255, 255, 255, 0.98); 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            pointer-events: none; 
            font-size: 12px;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
            z-index: 1000;
          }
          .controls {
            display: flex;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
          }
          button {
            padding: 8px 16px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
          }
          button:hover {
            background: #357abd;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .stats {
            color: #666;
            font-size: 12px;
            margin-left: auto;
          }
          .legend {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 11px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }
          .search-container {
            margin: 10px 0;
          }
          .search-input {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 250px;
            font-size: 12px;
          }
          .header-content {
            transition: opacity 0.2s ease;
          }
          .header.collapsed .header-content {
            opacity: 0.3;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <h1 style="margin: 0 0 10px 0; color: #333;">Block Structure Diagram</h1>
            <div class="controls">
              <button onclick="resetZoom()">🔍 Сбросить масштаб</button>
              <button onclick="downloadSVG()">📥 Скачать SVG</button>
              <div class="stats" id="stats">
                Узлы: ${nodes.length}, Связи: ${links.length}
              </div>
            </div>
            <div class="search-container">
              <input type="text" class="search-input" id="searchInput" placeholder="Поиск по имени блока...">
              <button onclick="searchNode()">🔍 Найти</button>
            </div>
            <div class="legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #ff6b35;"></div>
                <span>Блок</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #4a90e2;"></div>
                <span>Блок без описания</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #2ecc71;"></div>
                <span>Корневой узел</span>
              </div>
            </div>
          </div>
          <div class="header-toggle" onclick="toggleHeader()">
            <span class="toggle-icon">▼</span>
          </div>
        </div>
        <div id="graph-container"></div>
        
        <script>
          const data = {
            nodes: ${JSON.stringify(nodes)},
            links: ${JSON.stringify(links)}
          };

          let svg, zoom, treeLayout, root, treeData;
          let highlightedNode = null;
          let currentScale = 0.8;
          let currentTranslate = [0, 0];
          let isHeaderCollapsed = false;

          function toggleHeader() {
            const header = document.querySelector('.header');
            isHeaderCollapsed = !isHeaderCollapsed;
            header.classList.toggle('collapsed');
          }

          function createRadialTree() {
            const container = document.getElementById('graph-container');
            const width = container.clientWidth;
            const height = container.clientHeight;

            // Очищаем предыдущий граф
            d3.select('#graph-container').selectAll('*').remove();

            svg = d3.select('#graph-container')
              .append('svg')
              .attr('width', width)
              .attr('height', height)
              .append('g')
              .attr('transform', \`translate(\${width/2},\${height/2})\`);

            // Создаем tooltip
            const tooltip = d3.select('body')
              .append('div')
              .attr('class', 'tooltip')
              .style('opacity', 0);

            // Создаем корневую ноду для d3 hierarchy
            root = d3.stratify()
              .id(d => d.path)
              .parentId(d => {
                const parts = d.path.split(' → ');
                if (parts.length === 1) return null;
                return parts.slice(0, -1).join(' → ');
              })(data.nodes);

            // Увеличиваем радиус для большего расстояния от центра
            treeLayout = d3.tree()
              .size([2 * Math.PI, Math.min(width, height) / 2 * 2.5]) // Увеличили в 2.5 раза
              .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

            treeData = treeLayout(root);

            // Функция для вычисления цвета узла
            const getNodeColor = (d) => {
              if (d.depth === 0) return '#2ecc71'; // Корневой узел - зеленый
              return d.data.isLeaf ? '#ff6b35' : '#4a90e2'; // Конечные узлы - оранжевый, группы - синий
            };

            // Функция для вычисления радиуса узла
            const getNodeRadius = (d) => {
              if (d.depth === 0) return 10; // Корневой узел больше
              return d.data.isLeaf ? 6 : 4; // Конечные узлы больше чем группы
            };

            // Рисуем связи
            svg.append('g')
              .selectAll('path')
              .data(treeData.links())
              .enter()
              .append('path')
              .attr('d', d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y)
              )
              .style('fill', 'none')
              .style('stroke', '#ccc')
              .style('stroke-width', 2)
              .style('opacity', 0.7);

            // Рисуем узлы
            const node = svg.append('g')
              .selectAll('g')
              .data(treeData.descendants())
              .enter()
              .append('g')
              .attr('transform', d => \`
                rotate(\${d.x * 180 / Math.PI - 90})
                translate(\${d.y},0)
              \`)
              .attr('class', 'node')
              .attr('data-depth', d => d.depth)
              .attr('data-path', d => d.data.path);

            node.append('circle')
              .attr('r', getNodeRadius)
              .style('fill', '#fff')
              .style('stroke', getNodeColor)
              .style('stroke-width', 2)
              .style('cursor', 'pointer')
              .on('mouseover', function(event, d) {
                if (highlightedNode) return;
                
                d3.select(this)
                  .style('stroke', '#ff3860')
                  .style('stroke-width', 3)
                  .style('filter', 'drop-shadow(0 0 6px rgba(255,56,96,0.6))');
                
                // Подсвечиваем связанные связи
                svg.selectAll('path')
                  .style('opacity', 0.3);
                
                svg.selectAll('path')
                  .filter(link => link.source === d || link.target === d)
                  .style('opacity', 1)
                  .style('stroke', '#ff3860')
                  .style('stroke-width', 3);

                const blocksInfo = d.data.blocks && d.data.blocks.length > 0 
                  ? d.data.blocks.map(b => 
                      \`<div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                        <strong style="color: #333;">\${b.name}</strong><br>
                        <span style="color: #666; font-size: 11px;">\${b.description}</span><br>
                        <small style="color: #999;">\${b.directory}</small>
                      </div>\`
                    ).join('')
                  : '<div style="color: #999; font-style: italic;">Нет информации о блоках</div>';
                
                tooltip
                  .style('opacity', 1)
                  .html(\`
                    <div style="border-left: 3px solid \${getNodeColor(d)}; padding-left: 8px;">
                      <strong style="color: #333; font-size: 13px;">\${d.data.name}</strong><br>
                      <div style="color: #666; font-size: 11px; margin: 5px 0;">
                        Путь: \${d.data.path}<br>
                        Глубина: \${d.depth}<br>
                        Дочерних узлов: \${d.children ? d.children.length : 0}
                      </div>
                      <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                        \${blocksInfo}
                      </div>
                    </div>
                  \`);
              })
              .on('mousemove', function(event) {
                tooltip
                  .style('left', (event.pageX + 15) + 'px')
                  .style('top', (event.pageY - 15) + 'px');
              })
              .on('mouseout', function(event, d) {
                if (highlightedNode) return;
                
                d3.select(this)
                  .style('stroke', getNodeColor(d))
                  .style('stroke-width', 2)
                  .style('filter', 'none');
                
                // Возвращаем прозрачность связям
                svg.selectAll('path')
                  .style('opacity', 0.7)
                  .style('stroke', '#ccc')
                  .style('stroke-width', 2);
                
                tooltip.style('opacity', 0);
              })
              .on('click', function(event, d) {
                event.stopPropagation();
                highlightNode(d);
              });

            // Добавляем текст
            node.append('text')
              .attr('dy', d => d.x < Math.PI ? '0.31em' : '-0.31em')
              .attr('x', d => d.x < Math.PI ? 12 : -12)
              .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
              .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
              .style('font-size', d => {
                if (d.depth === 0) return '13px';
                if (d.depth === 1) return '12px';
                return d.data.isLeaf ? '11px' : '10px';
              })
              .style('font-weight', d => d.depth <= 1 ? 'bold' : 'normal')
              .style('fill', d => d.depth === 0 ? '#2c3e50' : (d.data.isLeaf ? '#e74c3c' : '#34495e'))
              .style('opacity', d => d.depth <= 2 || d.data.isLeaf ? 1 : 0.8)
              .text(d => d.data.name)
              .clone(true).lower()
              .attr('stroke', 'white')
              .attr('stroke-width', 3)
              .attr('stroke-linejoin', 'round');

            // Добавляем масштабирование
            zoom = d3.zoom()
              .scaleExtent([0.1, 3])
              .on('zoom', (event) => {
                const transform = event.transform;
                currentScale = transform.k;
                currentTranslate = [transform.x, transform.y];
                svg.attr('transform', \`translate(\${transform.x},\${transform.y}) scale(\${transform.k})\`);
              });

            // Начальная трансформация - центрируем и устанавливаем масштаб
            const initialTransform = d3.zoomIdentity
              .translate(width / 2, height / 2)
              .scale(0.8);
              
            currentScale = 0.8;
            currentTranslate = [width / 2, height / 2];
            
            d3.select('svg')
              .call(zoom)
              .call(zoom.transform, initialTransform);

            // Обработчик клика по фону для сброса выделения
            d3.select('svg').on('click', function(event) {
              if (event.target === this) {
                resetHighlight();
              }
            });
          }

          function highlightNode(d) {
            resetHighlight();
            highlightedNode = d;
            
            // Подсвечиваем выбранный узел
            d3.selectAll('.node')
              .filter(node => node === d)
              .select('circle')
              .style('stroke', '#ff3860')
              .style('stroke-width', 4)
              .style('filter', 'drop-shadow(0 0 10px rgba(255,56,96,0.8))');
            
            // Подсвечиваем путь к корню
            let current = d;
            while (current && current.parent) {
              d3.selectAll('.node')
                .filter(node => node === current)
                .select('circle')
                .style('stroke', '#4a90e2')
                .style('stroke-width', 3);
              current = current.parent;
            }
            
            // Подсвечиваем связи
            svg.selectAll('path')
              .style('opacity', 0.2);
            
            let linkCurrent = d;
            while (linkCurrent && linkCurrent.parent) {
              svg.selectAll('path')
                .filter(link => link.source === linkCurrent.parent && link.target === linkCurrent)
                .style('opacity', 1)
                .style('stroke', '#4a90e2')
                .style('stroke-width', 2);
              linkCurrent = linkCurrent.parent;
            }
          }

          function resetHighlight() {
            highlightedNode = null;
            d3.selectAll('.node circle')
              .style('stroke', d => getNodeColor(d))
              .style('stroke-width', 2)
              .style('filter', 'none');
            
            svg.selectAll('path')
              .style('opacity', 0.7)
              .style('stroke', '#ccc')
              .style('stroke-width', 2);
          }

          function resetZoom() {
            const container = document.getElementById('graph-container');
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            const resetTransform = d3.zoomIdentity
              .translate(width / 2, height / 2)
              .scale(0.8);
              
            currentScale = 0.8;
            currentTranslate = [width / 2, height / 2];
              
            d3.select('svg').transition().duration(750).call(
              zoom.transform,
              resetTransform
            );
            resetHighlight();
          }

          function downloadSVG() {
            // Создаем новый SVG для скачивания с фиксированными размерами
            const downloadSvg = d3.create('svg')
              .attr('width', 2000)
              .attr('height', 2000)
              .attr('xmlns', 'http://www.w3.org/2000/svg');

            // Создаем группу и центрируем ее
            const g = downloadSvg.append('g')
              .attr('transform', 'translate(1000,1000)');

            // Используем сохраненные данные дерева для рендеринга
            const treeLayout = d3.tree()
              .size([2 * Math.PI, 800]) // Фиксированный радиус для скачивания
              .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

            const treeData = treeLayout(root);

            // Функция для вычисления цвета узла
            const getNodeColor = (d) => {
              if (d.depth === 0) return '#2ecc71';
              return d.data.isLeaf ? '#ff6b35' : '#4a90e2';
            };

            // Функция для вычисления радиуса узла
            const getNodeRadius = (d) => {
              if (d.depth === 0) return 10;
              return d.data.isLeaf ? 6 : 4;
            };

            // Рисуем связи
            g.append('g')
              .selectAll('path')
              .data(treeData.links())
              .enter()
              .append('path')
              .attr('d', d3.linkRadial()
                .angle(d => d.x)
                .radius(d => d.y)
              )
              .style('fill', 'none')
              .style('stroke', '#ccc')
              .style('stroke-width', 2)
              .style('opacity', 0.7);

            // Рисуем узлы
            const node = g.append('g')
              .selectAll('g')
              .data(treeData.descendants())
              .enter()
              .append('g')
              .attr('transform', d => \`
                rotate(\${d.x * 180 / Math.PI - 90})
                translate(\${d.y},0)
              \`);

            node.append('circle')
              .attr('r', getNodeRadius)
              .style('fill', '#fff')
              .style('stroke', getNodeColor)
              .style('stroke-width', 2);

            // Добавляем текст
            node.append('text')
              .attr('dy', d => d.x < Math.PI ? '0.31em' : '-0.31em')
              .attr('x', d => d.x < Math.PI ? 12 : -12)
              .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
              .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
              .style('font-size', d => {
                if (d.depth === 0) return '13px';
                if (d.depth === 1) return '12px';
                return d.data.isLeaf ? '11px' : '10px';
              })
              .style('font-weight', d => d.depth <= 1 ? 'bold' : 'normal')
              .style('fill', d => d.depth === 0 ? '#2c3e50' : (d.data.isLeaf ? '#e74c3c' : '#34495e'))
              .text(d => d.data.name)
              .clone(true).lower()
              .attr('stroke', 'white')
              .attr('stroke-width', 3)
              .attr('stroke-linejoin', 'round');

            // Сериализуем и скачиваем
            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(downloadSvg.node());
            const blob = new Blob([source], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'block-structure-diagram.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          function searchNode() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            if (!searchTerm) return;
            
            const foundNodes = d3.selectAll('.node')
              .filter(d => d.data.name.toLowerCase().includes(searchTerm) || 
                          d.data.path.toLowerCase().includes(searchTerm));
            
            if (foundNodes.size() > 0) {
              const firstNode = foundNodes.datum();
              highlightNode(firstNode);
              
              // Центрируем на найденном узле
              const container = document.getElementById('graph-container');
              const width = container.clientWidth;
              const height = container.clientHeight;
              
              const [x, y] = [firstNode.y * Math.cos(firstNode.x), firstNode.y * Math.sin(firstNode.x)];
              const transform = d3.zoomIdentity
                .translate(width / 2 - x, height / 2 - y)
                .scale(1.5);
              
              d3.select('svg').transition().duration(1000).call(
                zoom.transform,
                transform
              );
            } else {
              alert('Узел не найден');
            }
          }

          // Вспомогательные функции для вычисления цвета
          function getNodeColor(d) {
            if (d.depth === 0) return '#2ecc71';
            return d.data.isLeaf ? '#ff6b35' : '#4a90e2';
          }

          // Инициализация при загрузке
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createRadialTree);
          } else {
            createRadialTree();
          }

          window.addEventListener('resize', function() {
            createRadialTree();
          });

          // Добавляем обработчик Enter для поиска
          document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              searchNode();
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Основной метод анализа директории и построения графа
   */
  async analyzeDirectory(dirPath, options = {}) {
    try {
      console.log(`Анализируем директорию: ${dirPath}`);
      
      // Находим все файлы определений блоков
      const definitionFiles = await this.findBlockDefinitionFiles(dirPath);
      console.log(`Найдено файлов: ${definitionFiles.length}`);

      // Читаем и парсим каждый файл
      const blocks = [];
      for (const filePath of definitionFiles) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const block = this.parseBlockDefinition(filePath, content);
          if (block && !block.ignore) {
            blocks.push(block);
          }
        } catch (error) {
          console.warn(`Ошибка чтения файла ${filePath}:`, error.message);
        }
      }

      this.blocks = blocks;
      
      // Строим граф
      const graph = this.buildGraph(blocks);
      this.nodes = graph.nodes;
      this.links = graph.links;

      console.log(`Построен граф: ${this.nodes.length} узлов, ${this.links.length} связей`);

      return {
        blocks: this.blocks,
        nodes: this.nodes,
        links: this.links,
        generateSVG: (width, height) => this.generateSVGGraph(this.nodes, this.links, width, height),
        generateHTML: (width, height) => this.generateInteractiveGraph(this.nodes, this.links, width, height)
      };
    } catch (error) {
      console.error('Ошибка анализа директории:', error);
      throw error;
    }
  }
}

module.exports = BlockGraphBuilder;