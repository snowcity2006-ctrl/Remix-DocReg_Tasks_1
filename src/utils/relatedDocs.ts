import { DocumentRecord } from '../types';

/**
 * Возвращает множество ID всех взаимосвязанных документов (сам документ + все связанные с ним).
 * Учитывает двунаправленные связи (если А связан с Б, то Б также взаимосвязан с А)
 * и транзитивные цепочки связей.
 */
export function getInterconnectedDocIds(
  targetDocId: number,
  allDocuments: DocumentRecord[]
): Set<number> {
  const result = new Set<number>();
  result.add(targetDocId);

  // Построение карты смежности связей
  const adjacency = new Map<number, Set<number>>();
  for (const doc of allDocuments) {
    if (!adjacency.has(doc.id)) {
      adjacency.set(doc.id, new Set());
    }
    if (doc.relatedDocIds && Array.isArray(doc.relatedDocIds)) {
      for (const relId of doc.relatedDocIds) {
        if (relId === doc.id) continue;
        adjacency.get(doc.id)!.add(relId);
        if (!adjacency.has(relId)) {
          adjacency.set(relId, new Set());
        }
        adjacency.get(relId)!.add(doc.id);
      }
    }
  }

  // Обход графа связей (BFS)
  const queue: number[] = [targetDocId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adjacency.get(currentId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!result.has(neighborId)) {
          result.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  return result;
}

/**
 * Проверяет, есть ли у документа связанные с ним документы.
 */
export function hasRelatedDocuments(
  docId: number,
  allDocuments: DocumentRecord[]
): boolean {
  const interconnected = getInterconnectedDocIds(docId, allDocuments);
  return interconnected.size > 1;
}

/**
 * Возвращает количество связанных документов (исключая сам документ).
 */
export function getRelatedDocumentsCount(
  docId: number,
  allDocuments: DocumentRecord[]
): number {
  const count = getInterconnectedDocIds(docId, allDocuments).size - 1;
  return count > 0 ? count : 0;
}
