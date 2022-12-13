import { View, Text, useWindowDimensions } from "react-native";
import React, { useEffect, useState } from "react";
import {
  clamp,
  getItemTop,
  handleReorderOriginalSections,
  moveObject
} from "./Utils";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MoveableItem({
  itemPositions,
  item,
  sectionID,
  movingItem,
  renderItem,
  itemHeight,
  sectionHeaderHeight,
  sectionTop,
  scrollY,
  contentHeight,
  onReorder,
  sections,
  pendingScrollY,
  sectionDragging,
  amazingEffect
}) {
  const [moving, setMoving] = useState(false);
  const SCROLL_HEIGHT_THRESHOLD = itemHeight;
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const itemTop = useSharedValue(
    getItemTop(item.id, itemPositions, itemHeight, sectionHeaderHeight)
  );
  const fixedItemTop = useSharedValue(
    getItemTop(item.id, itemPositions, itemHeight, sectionHeaderHeight)
  );
  const widthPercentage = useSharedValue(100);

  // Handle amazing effects
  useEffect(() => {
    if (amazingEffect) {
      if (sectionDragging) {
        widthPercentage.value = withTiming(0, {
          duration: 200,
          easing: Easing.bezier(0.79, 0.33, 0.14, 0.53)
        });
        itemTop.value = withTiming(0 + sectionHeaderHeight, {
          duration: 200,
          easing: Easing.bezier(0.79, 0.33, 0.14, 0.53)
        });
      } else {
        widthPercentage.value = withTiming(100, {
          duration: 200,
          easing: Easing.bezier(0.79, 0.33, 0.14, 0.53)
        });
        itemTop.value = withTiming(fixedItemTop.value, {
          duration: 200,
          easing: Easing.bezier(0.79, 0.33, 0.14, 0.53)
        });
      }
    }
  }, [sectionDragging]);

  useAnimatedReaction(
    () => itemPositions.value[item.id],
    (currentPosition, previousPosition) => {
      if (currentPosition !== previousPosition) {
        if (!moving) {
          itemTop.value = withSpring(
            getItemTop(item.id, itemPositions, itemHeight, sectionHeaderHeight)
          );
        }
      }
    },
    [moving]
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      movingItem.value = {
        id: item.id,
        sectionId: sectionID,
        toSectionId: sectionID,
        fromIndex: itemPositions.value[item.id],
        toIndex: itemPositions.value[item.id],
        positionY: e.absoluteY
      };
      runOnJS(setMoving)(true);
    })
    .onUpdate((e) => {
      const positionY =
        e.absoluteY - sectionTop.value - sectionHeaderHeight + scrollY.value;
      movingItem.value = {
        ...movingItem.value,
        positionY: positionY + sectionTop.value
      };
      // Handle scroll
      if (e.absoluteY <= insets.top + SCROLL_HEIGHT_THRESHOLD) {
        // Scroll up
        pendingScrollY.value = withTiming(0, {
          duration: 2500
        });
      } else if (e.absoluteY >= dimensions.height - SCROLL_HEIGHT_THRESHOLD) {
        // Scroll down
        pendingScrollY.value = withTiming(contentHeight, {
          duration: 2500
        });
      } else {
        cancelAnimation(pendingScrollY);
      }

      // Handle item movement
      itemTop.value = withTiming(positionY, {
        duration: 16
      });
      const numOfItems = Object.keys(itemPositions.value).length;
      const newPosition = clamp(
        Math.floor(positionY / itemHeight),
        0,
        numOfItems - 1
      );

      movingItem.value = {
        ...movingItem.value,
        toIndex: newPosition
      };
      if (newPosition !== itemPositions.value[item.id]) {
        itemPositions.value = moveObject(
          itemPositions,
          itemPositions.value[item.id],
          newPosition
        );
      }
    })
    .onEnd((e) => {
      if (onReorder) {
        const newSections = handleReorderOriginalSections(
          sections,
          movingItem,
          itemPositions
        );
        runOnJS(onReorder)(newSections);
      }
      itemTop.value = withTiming(
        getItemTop(item.id, itemPositions, itemHeight, sectionHeaderHeight)
      );
      movingItem.value = null;
      cancelAnimation(pendingScrollY);
      runOnJS(setMoving)(false);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: itemTop.value ? itemTop.value : 0,
      width: `${widthPercentage.value}%`,
      zIndex: moving ? 100 : -1,
      shadowColor: "black",
      shadowOffset: {
        height: 0,
        width: 0
      },
      shadowOpacity: withSpring(moving ? 0.2 : 0),
      shadowRadius: 10
    };
  }, [moving]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          animatedStyle,
          {
            height: itemHeight,
            justifyContent: "center"
          }
        ]}
      >
        {renderItem(item)}
      </Animated.View>
    </GestureDetector>
  );
}
