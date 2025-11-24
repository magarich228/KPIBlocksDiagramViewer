const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { JSDOM } = require('jsdom');

class BlockGraphBuilder {
  constructor() {
    this.blocks = [];
    this.nodes = [];
    this.links = [];
    this.baseDir = '';
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
      const relativeDir = this.getRelativePath(dirName);
      
      // Обрабатываем parents - разделяем по запятой и обрезаем пробелы
      const parents = typeof data.parents === 'string' 
        ? data.parents.split(',').map(p => p.trim()).filter(p => p)
        : data.parents || [];

      // Обрабатываем blockPart - разделяем по / и фильтруем пустые элементы
      const blockPart = typeof data.blockPart === 'string' && data.blockPart.trim() !== ''
        ? data.blockPart.split('/').filter(part => part.trim() !== '')
        : [];

      // Обрабатываем based - разделяем по запятой и обрезаем пробелы
      const based = typeof data.based === 'string' 
        ? data.based.split(',').map(p => p.trim()).filter(p => p)
        : data.based || [];

      // Обрабатываем extend - разделяем по запятой и обрезаем пробелы
      const extend = typeof data.extend === 'string' 
        ? data.extend.split(',').map(p => p.trim()).filter(p => p)
        : data.extend || [];

      return {
        filePath,
        directory: relativeDir,
        parents: parents,
        blockName: data.blockName || 'Unknown',
        blockPart: blockPart,
        description: data.description || '',
        aspects: data.aspects || '',
        ignore: data.ignore || false,
        based: based,
        extend: extend
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

    blocks.forEach(block => {
      if (block.ignore) return;

      // Строим полный путь: parents -> blockName -> blockPart
      const fullPath = [...block.parents, block.blockName, ...block.blockPart];
      
      // Создаем узлы для каждого сегмента в пути
      for (let i = 0; i < fullPath.length; i++) {
        const segmentPath = fullPath.slice(0, i + 1).join(' → ');
        const segmentName = fullPath[i];
        
        if (!nodeMap.has(segmentPath)) {
          const isLeaf = i === fullPath.length - 1;
          const isBlockNode = i === block.parents.length; // Узел с blockName
          const isPartNode = i > block.parents.length; // Узел из blockPart
          
          const node = {
            id: nodeId++,
            name: segmentName,
            path: segmentPath,
            depth: i,
            isLeaf: isLeaf,
            isRoot: segmentName === 'RGB' && i === 0,
            isBlockNode: isBlockNode,
            isPartNode: isPartNode,
            blocks: []
          };
          
          nodeMap.set(segmentPath, node);
          nodes.push(node);
        }

        // Если это конечный узел (блок), добавляем информацию о блоке
        if (i === fullPath.length - 1) {
          const node = nodeMap.get(segmentPath);
          node.blocks.push({
            name: block.blockName,
            description: block.description,
            aspects: block.aspects,
            directory: block.directory,
            parents: block.parents,
            blockPart: block.blockPart,
            based: block.based,
            extend: block.extend
          });
        }
      }

      // Создаем связи между узлами
      for (let i = 1; i < fullPath.length; i++) {
        const sourcePath = fullPath.slice(0, i).join(' → ');
        const targetPath = fullPath.slice(0, i + 1).join(' → ');
        
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

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .node circle { fill: #fff; stroke: steelblue; stroke-width: 3px; }
            .node text { font: 15px sans-serif; }
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
            padding: 8px 15px; 
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
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 70px;
            height: 30px;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 6px 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1001;
            font-size: 12px;
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
            stroke-width: 2px; 
            transition: all 0.3s ease;
          }
          .node text { 
            font: 14px sans-serif; 
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
            stroke-width: 3px; 
            filter: drop-shadow(0 0 8px rgba(255,107,53,0.4));
          }
          .node:hover ~ .link { 
            stroke-width: 2px;
          }
          .tooltip { 
            position: absolute; 
            padding: 10px 12px; 
            background: rgba(255, 255, 255, 0.98); 
            border: 1px solid #ddd; 
            border-radius: 6px; 
            pointer-events: none; 
            font-size: 11px;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
            z-index: 1000;
          }
          .header-content {
            display: flex;
            align-items: center;
            gap: 15px;
            transition: opacity 0.2s ease;
          }
          .header.collapsed .header-content {
            opacity: 0.3;
            pointer-events: none;
          }
          .header-title {
            margin: 0;
            color: #333;
            font-size: 16px;
            white-space: nowrap;
          }
          .search-container {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            max-width: 400px;
          }
          .search-input {
            padding: 6px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            flex: 1;
            font-size: 12px;
            min-width: 200px;
          }
          .controls {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
          }
          button {
            padding: 6px 12px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
            white-space: nowrap;
          }
          button:hover {
            background: #357abd;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .stats {
            color: #666;
            font-size: 11px;
            white-space: nowrap;
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
          @media (max-width: 1200px) {
            .header-content {
              flex-wrap: wrap;
              gap: 8px;
            }
            .header-title {
              font-size: 14px;
            }
            .search-container {
              max-width: 300px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <h1 class="header-title">Блоки КПИ</h1>            
            <div class="search-container">
              <input type="text" class="search-input" id="searchInput" placeholder="Поиск по имени блока...">
              <button onclick="searchNode()">🔍 Найти</button>
            </div>
            <div class="legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #2ecc71;"></div>
                <span>Корневой узел</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #4a90e2;"></div>
                <span>Блок</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #87ceeb;"></div>
                <span>Группа блоков без описания</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #ff6b35;"></div>
                <span>Часть блока</span>
              </div>
            </div>

            <div class="controls">
              <button onclick="resetZoom()">🔍 Сбросить масштаб</button>
              <button onclick="downloadSVG()">📥 Скачать SVG</button>
              <div class="stats" id="stats">
                Узлы: ${nodes.length}, Связи: ${links.length}
              </div>
            </div>
          </div>
          <div class="header-toggle" onclick="toggleHeader()">
            <span class="toggle-icon">▲</span>
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

          // Функция для вычисления цвета узла на основе его типа
          function getNodeColor(d) {
            if (d.data.isRoot) return '#2ecc71'; // Корневой узел - зеленый
            if (d.data.isPartNode) return '#ff6b35'; // Часть блока - оранжевый
            if (d.data.isBlockNode) return '#4a90e2'; // Блок - синий
            return '#87ceeb'; // Группа блоков без описания - голубой
          }

          // Функция для вычисления радиуса узла
          function getNodeRadius(d) {
            if (d.data.isRoot) return 10; // Корневой узел больше
            if (d.data.isBlockNode) return 7; // Основные блоки
            if (d.data.isPartNode) return 5; // Части блоков
            return 4; // Узлы-группы без описания
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
              .size([2 * Math.PI, Math.min(width, height) / 2 * 2.5])
              .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

            treeData = treeLayout(root);

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

                // Формируем информацию для tooltip
                const blocksInfo = d.data.blocks && d.data.blocks.length > 0 
                  ? d.data.blocks.map(b => {
                      const aspectsInfo = b.aspects ? 
                        \`<div style="margin-top: 5px;">
                          <strong>Аспекты:</strong> \${b.aspects}
                        </div>\` : '';
                      
                      const parentsInfo = b.parents && b.parents.length > 0 ?
                        \`<div style="margin-top: 5px;">
                          <strong>Родители:</strong> \${b.parents.join(' → ')}
                        </div>\` : '';
                      
                      const partInfo = b.blockPart && b.blockPart.length > 0 ?
                        \`<div style="margin-top: 5px;">
                          <strong>Часть:</strong> /\${b.blockPart.join('/')}
                        </div>\` : '';

                      // Информация о based (основа блока)
                      const basedInfo = b.based && b.based.length > 0 ?
                        \`<div style="margin-top: 5px;">
                          <strong>Основан на:</strong> \${b.based.join(', ')}
                        </div>\` : '';

                      // Информация о extend (расширяющие блоки)
                      const extendInfo = b.extend && b.extend.length > 0 ?
                        \`<div style="margin-top: 5px;">
                          <strong>Расширяет:</strong> \${b.extend.join(', ')}
                        </div>\` : '';
                      
                      return \`
                        <div style="margin: 8px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid \${getNodeColor(d)};">
                          <strong style="color: #333; font-size: 12px;">\${b.name}</strong><br>
                          <span style="color: #666; font-size: 11px;">\${b.description}</span>
                          \${parentsInfo}
                          \${partInfo}
                          \${aspectsInfo}
                          \${basedInfo}
                          \${extendInfo}
                          <div style="margin-top: 5px;">
                            <small style="color: #999;">\${b.directory}</small>
                          </div>
                        </div>
                      \`;
                    }).join('')
                  : '<div style="color: #999; font-style: italic; padding: 8px;">Нет информации о блоках</div>';
                
                tooltip
                  .style('opacity', 1)
                  .html(\`
                    <div style="border-left: 3px solid \${getNodeColor(d)}; padding-left: 8px;">
                      <strong style="color: #333; font-size: 13px;">\${d.data.name}</strong><br>
                      <div style="color: #666; font-size: 11px; margin: 5px 0;">
                        Путь: \${d.data.path}<br>
                        Глубина: \${d.depth}<br>
                        Тип: \${d.data.isRoot ? 'Корневой узел' : d.data.isBlockNode ? 'Блок' : d.data.isPartNode ? 'Часть блока' : 'Группа блоков'}<br>
                        Дочерних узлов: \${d.children ? d.children.length : 0}
                      </div>
                      <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                        <strong>Информация о блоке:</strong>
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
                if (d.data.isRoot) return '16px';
                if (d.depth <= 1) return '15px';
                return d.data.isBlockNode ? '14px' : '13px';
              })
              .style('font-weight', d => d.depth <= 1 || d.data.isBlockNode ? 'bold' : 'normal')
              .style('fill', '#000000')
              .style('opacity', d => d.depth <= 2 || d.data.isBlockNode || d.data.isPartNode ? 1 : 0.8)
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
              .style('stroke-width', d => getNodeRadius(d) > 6 ? 3 : 2)
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
              .size([2 * Math.PI, 800])
              .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

            const treeData = treeLayout(root);

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
                if (d.data.isRoot) return '16px';
                if (d.depth <= 1) return '15px';
                return d.data.isBlockNode ? '14px' : '13px';
              })
              .style('font-weight', d => d.depth <= 1 || d.data.isBlockNode ? 'bold' : 'normal')
              .style('fill', '#000000')
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
      this.baseDir = dirPath;
      
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

  /**
   * Преобразует абсолютный путь в относительный относительно базовой директории
   */
  getRelativePath(absolutePath) {
    if (!this.baseDir) return absolutePath;
    
    try {
      const relativePath = path.relative(this.baseDir, absolutePath);
      return `.${path.sep}${relativePath.split(path.sep).join(path.sep)}`;
    } catch (error) {
      console.warn(`Не удалось преобразовать путь: ${absolutePath}`, error.message);
      return absolutePath;
    }
  }
}

module.exports = BlockGraphBuilder;