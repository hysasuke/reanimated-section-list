export function generatePositions(data) {
  "worklet";
  const positions = {};
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    positions[item.id] = i;
  }
  return positions;
}

export function getSectionTop(
  sectionPositions,
  sections,
  sectionID,
  sectionHeaderHeight,
  itemHeight
) {
  "worklet";
  let top = 0;
  const orderedSectionKeys = Object.keys(sectionPositions.value).sort(
    (a, b) => sectionPositions.value[a] - sectionPositions.value[b]
  );
  for (let i = 0; i < orderedSectionKeys.length; i++) {
    const sectionKey = orderedSectionKeys[i];
    if (sectionKey === sectionID) {
      return top;
    }
    const section = sections.find((s) => s.id === sectionKey);
    top += sectionHeaderHeight + section.data.length * itemHeight;
  }
  return top;
}

export function calculateContentHeight(
  sections,
  itemHeight,
  sectionHeaderHeight
) {
  const numberOfItems = sections.reduce((acc, section) => {
    return acc + section.data.length;
  }, 0);
  return numberOfItems * itemHeight + sections.length * sectionHeaderHeight;
}

export function getItemTop(
  itemID,
  itemPositions,
  itemHeight,
  sectionHeaderHeight
) {
  "worklet";
  let itemOrder = itemPositions.value[itemID] ? itemPositions.value[itemID] : 0;
  return itemOrder * itemHeight + sectionHeaderHeight;
}

export function moveObject(positions, from, to) {
  "worklet";

  const newObject = Object.assign({}, positions.value);
  for (const id in positions.value) {
    if (positions.value[id] === from) {
      newObject[id] = to;
    }

    if (positions.value[id] === to) {
      newObject[id] = from;
    }
  }

  return newObject;
}

export function clamp(value, min, max) {
  "worklet";
  return Math.max(min, Math.min(max, value));
}

export function handleReorderOriginalSections(
  sections,
  movingItem,
  itemPositions
) {
  "worklet";
  const fromSectionID = movingItem.value.sectionId;
  const toSectionID = movingItem.value.toSectionId;
  const fromSection = sections.find((section) => section.id === fromSectionID);
  const toSection = sections.find((section) => section.id === toSectionID);
  if (fromSectionID === toSectionID) {
    // Reorder section data based on itemPositions
    const newSectionData = [...fromSection.data];
    const newSectionDataSorted = newSectionData.sort((a, b) => {
      return itemPositions.value[a.id] - itemPositions.value[b.id];
    });
    const newSections = sections.map((section) => {
      if (section.id === fromSectionID) {
        return {
          ...section,
          data: newSectionDataSorted
        };
      }
      return section;
    });
    return newSections;
  } else {
    const fromIndex = movingItem.value.fromIndex;
    const item = fromSection.data[fromIndex];
    const newFromSectionData = [...fromSection.data];
    newFromSectionData.splice(fromIndex, 1);
    const newToSectionData = [...toSection.data];
    newToSectionData.splice(0, 0, item);
    const newSections = sections.map((section) => {
      if (section.id === fromSectionID) {
        return {
          ...section,
          data: newFromSectionData
        };
      }
      if (section.id === toSectionID) {
        return {
          ...section,
          data: newToSectionData
        };
      }
      return section;
    });
    return newSections;
  }
}

export function handleReorderSections(sectionPositions, sections) {
  "worklet";
  const newSections = sections.sort((a, b) => {
    return sectionPositions.value[a.id] - sectionPositions.value[b.id];
  });
  return newSections;
}
