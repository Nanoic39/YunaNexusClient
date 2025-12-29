/**
 * 美观的控制台日志工具
 */
export const logger = {
  /**
   * 打印错误信息
   * @param title 标题
   * @param error 错误对象或信息
   */
  error: (title: string, error: any) => {
    if (process.env.NODE_ENV === 'production') return;

    const styles = [
      'background: #ff4d4f',
      'border-radius: 3px',
      'color: white',
      'font-weight: bold',
      'padding: 2px 6px',
      'display: inline-block'
    ].join(';');

    const msgStyles = [
      'color: #ff4d4f',
      'font-weight: bold'
    ].join(';');

    console.groupCollapsed(`%c Error %c ${title}`, styles, msgStyles);
    console.log('%cTime:', 'color: #888', new Date().toLocaleTimeString());
    console.log('%cMessage:', 'color: #888', error.message || error);
    if (error.stack) {
      console.log('%cStack:', 'color: #888', error.stack);
    }
    if (error.response) {
      console.log('%cResponse:', 'color: #888', error.response);
    }
    console.groupEnd();
  },

  /**
   * 打印信息
   */
  info: (title: string, message: any) => {
    if (process.env.NODE_ENV === 'production') return;
    
    const styles = [
      'background: #1890ff',
      'border-radius: 3px',
      'color: white',
      'font-weight: bold',
      'padding: 2px 6px'
    ].join(';');

    console.log(`%c Info %c ${title}`, styles, 'color: #1890ff', message);
  }
};