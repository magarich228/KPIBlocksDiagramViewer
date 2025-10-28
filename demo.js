const BlockGraphBuilder = require('./block-graph-builder');
const fs = require('fs');
const path = require('path');

async function demo() {
  const builder = new BlockGraphBuilder();
  
  // Анализируем текущую директорию (можно указать любую другую)
  const result = await builder.analyzeDirectory("C:\\Users\\k.groshev\\source\\repos\\rgb3");
  
  console.log('\n=== АНАЛИЗ ЗАВЕРШЕН ===');
  console.log(`Найдено блоков: ${result.blocks.length}`);
  console.log(`Создано узлов: ${result.nodes.length}`);
  console.log(`Создано связей: ${result.links.length}`);
  
  // Генерируем HTML для просмотра
  const html = result.generateHTML();
  const outputPath = path.join(__dirname, 'block-diagram.html');
  fs.writeFileSync(outputPath, html);
  console.log(`\nДиаграмма сохранена в: ${outputPath}`);
  
  // Выводим информацию о блоках
  console.log('\n=== НАЙДЕННЫЕ БЛОКИ ===');
  result.blocks.forEach(block => {
    console.log(`• ${block.name} (${block.relativePath})`);
    console.log(`  Part: ${block.part.join(' → ')}`);
    console.log(`  Desc: ${block.description}`);
  });
  
  // Выводим информацию о графе
  console.log('\n=== СТРУКТУРА ГРАФА ===');
  result.nodes.forEach(node => {
    if (node.isLeaf) {
      console.log(`🔹 ${node.path}`);
    }
  });
}

// Запускаем демо если файл запущен напрямую
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = demo;