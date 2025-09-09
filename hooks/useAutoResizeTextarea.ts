
import { useEffect, useRef } from 'react';

export const useAutoResizeTextarea = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  value: string
) => {
  const isMounted = useRef(false);

  useEffect(() => {
    // This effect runs on every render except the first one.
    // The first render is skipped to avoid miscalculating scrollHeight
    // while the parent container might be animating its width.
    // By running on subsequent renders, it correctly resizes the textarea
    // not just when the text `value` changes, but also when other state
    // changes cause a re-render and potential layout shifts.
    if (isMounted.current) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        // Only set the height if there is content. If value is empty,
        // it will remain at its default 'auto' height, respecting the 'rows' attribute.
        if (value) {
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      }
    } else {
      isMounted.current = true;
    }
  }); // The absence of a dependency array is intentional to run on every render.
};
