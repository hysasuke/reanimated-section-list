import { View, Text } from "react-native";
import React, { useEffect, useRef } from "react";
import { calculateContentHeight, generatePositions } from "./Utils";
import Animated, {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import Section from "./Section";
export default function SectionList({
  sections,
  renderItem,
  renderSectionHeader,
  itemHeight,
  sectionHeaderHeight,
  onReorder,
  amazingEffect = false
}) {
  let sectionPositions = useSharedValue(generatePositions(sections));
  let contentHeight = calculateContentHeight(
    sections,
    itemHeight,
    sectionHeaderHeight
  );
  let scrollViewRef = useAnimatedRef();

  let scrollY = useSharedValue(0);
  const movingItem = useSharedValue(null);
  let pendingScrollY = useSharedValue(0);
  useAnimatedReaction(
    () => pendingScrollY.value,
    (scrolling) => {
      scrollTo(scrollViewRef, 0, scrolling, false);
    }
  );

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    sectionPositions.value = generatePositions(sections);
  }, [sections]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ height: contentHeight }}
      >
        {sections.map((section) => {
          return (
            <Section
              onReorder={onReorder}
              movingItem={movingItem}
              sections={sections}
              key={section.id}
              section={section}
              sectionPositions={sectionPositions}
              data={section.data}
              contentHeight={contentHeight}
              scrollY={scrollY}
              renderItem={renderItem}
              itemHeight={itemHeight}
              sectionHeaderHeight={sectionHeaderHeight}
              renderSectionHeader={renderSectionHeader}
              pendingScrollY={pendingScrollY}
              amazingEffect={amazingEffect}
            />
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}
