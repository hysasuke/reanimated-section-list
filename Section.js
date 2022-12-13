import { View, Text, useWindowDimensions } from "react-native";
import React, { useEffect, useState } from "react";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import {
  clamp,
  generatePositions,
  getSectionTop,
  handleReorderSections,
  moveObject
} from "./Utils";
import MoveableItem from "./MoveableItem";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function Section({
  onReorder,
  movingItem,
  sections,
  section,
  sectionPositions,
  data,
  renderItem,
  itemHeight,
  sectionHeaderHeight,
  renderSectionHeader,
  scrollY,
  contentHeight,
  pendingScrollY,
  amazingEffect
}) {
  const SCROLL_HEIGHT_THRESHOLD = itemHeight;
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const dataPositions = useSharedValue(generatePositions(data));
  const [moving, setMoving] = useState(false);
  const [receivingDrop, setReceivingDrop] = useState(false);
  const borderWidth = useSharedValue(0);
  const sectionTop = useSharedValue(
    getSectionTop(
      sectionPositions,
      sections,
      section.id,
      sectionHeaderHeight,
      itemHeight
    )
  );
  const sectionBottom = useSharedValue(
    sectionTop.value + sectionHeaderHeight + data.length * itemHeight
  );

  useEffect(() => {
    dataPositions.value = generatePositions(data);
    sectionTop.value = withTiming(
      getSectionTop(
        sectionPositions,
        sections,
        section.id,
        sectionHeaderHeight,
        itemHeight
      )
    );
    sectionBottom.value =
      sectionTop.value + sectionHeaderHeight + data.length * itemHeight;
  }, [data]);

  useAnimatedReaction(
    () => movingItem.value,
    (currentPosition, previousPosition) => {
      if (currentPosition !== previousPosition && movingItem.value) {
        if (
          movingItem.value.positionY > sectionTop.value &&
          movingItem.value.positionY < sectionBottom.value &&
          movingItem.value.sectionId !== section.id
        ) {
          movingItem.value = { ...movingItem.value, toSectionId: section.id };
          runOnJS(setReceivingDrop)(true);
          borderWidth.value = withTiming(2);
        } else {
          runOnJS(setReceivingDrop)(false);
          borderWidth.value = withTiming(0);
        }
      } else {
        runOnJS(setReceivingDrop)(false);
        borderWidth.value = withTiming(0);
      }
    },
    [receivingDrop]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: sectionTop.value,
      zIndex: moving ? 100 : -1,
      borderWidth: borderWidth.value,
      borderColor: "#00a0e9",
      borderRadius: 10,
      // padding: borderWidth.value,
      shadowColor: "black",
      shadowOffset: {
        height: 0,
        width: 0
      },
      shadowOpacity: withSpring(moving ? 0.2 : 0),
      shadowRadius: 10,
      height: sectionBottom.value - sectionTop.value
    };
  }, [moving, receivingDrop]);

  // Handle section pan gesture
  useAnimatedReaction(
    () => sectionPositions.value[section.id],
    (currentPosition, previousPosition) => {
      if (currentPosition !== previousPosition) {
        if (!moving) {
          sectionTop.value = withSpring(
            getSectionTop(
              sectionPositions,
              sections,
              section.id,
              sectionHeaderHeight,
              itemHeight
            )
          );
        }
      }
    },
    [moving]
  );
  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(setMoving)(true);
    })
    .onUpdate((e) => {
      const positionY = e.absoluteY + scrollY.value;
      const sectionHeight = sectionHeaderHeight + data.length * itemHeight;
      // Handle scroll
      if (e.absoluteY <= insets.top + SCROLL_HEIGHT_THRESHOLD) {
        // Scroll up
        pendingScrollY.value = withTiming(0, {
          duration: 2500
        });
      } else if (
        e.absoluteY + sectionHeight / 3 >=
        dimensions.height - SCROLL_HEIGHT_THRESHOLD
      ) {
        // Scroll down
        pendingScrollY.value = withTiming(contentHeight, {
          duration: 2500
        });
      } else {
        cancelAnimation(pendingScrollY);
      }

      // Handle item movement
      sectionTop.value = withTiming(positionY - sectionHeaderHeight, {
        duration: 16
      });
      const numOfItems = Object.keys(sectionPositions.value).length;
      const newPosition = clamp(
        Math.floor(positionY / sectionHeight),
        0,
        numOfItems - 1
      );

      if (newPosition !== sectionPositions.value[section.id]) {
        sectionPositions.value = moveObject(
          sectionPositions,
          sectionPositions.value[section.id],
          newPosition
        );
      }
    })
    .onEnd((e) => {
      if (onReorder) {
        const newSections = handleReorderSections(sectionPositions, sections);
        runOnJS(onReorder)(newSections);
      }
      sectionTop.value = withTiming(
        getSectionTop(
          sectionPositions,
          sections,
          section.id,
          sectionHeaderHeight,
          itemHeight
        )
      );
      cancelAnimation(pendingScrollY);
      runOnJS(setMoving)(false);
    });

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector gesture={panGesture}>
        <View style={{ height: sectionHeaderHeight, justifyContent: "center" }}>
          {renderSectionHeader(section)}
        </View>
      </GestureDetector>
      {data.map((item) => {
        return (
          <MoveableItem
            onReorder={onReorder}
            key={item.id}
            sectionID={section.id}
            item={item}
            movingItem={movingItem}
            itemPositions={dataPositions}
            renderItem={renderItem}
            itemHeight={itemHeight}
            sectionHeaderHeight={sectionHeaderHeight}
            sectionTop={sectionTop}
            sectionBottom={sectionBottom}
            contentHeight={contentHeight}
            scrollY={scrollY}
            sections={sections}
            pendingScrollY={pendingScrollY}
            sectionDragging={moving}
            amazingEffect={amazingEffect}
          />
        );
      })}
    </Animated.View>
  );
}
