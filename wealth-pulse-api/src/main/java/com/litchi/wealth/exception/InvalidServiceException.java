package com.litchi.wealth.exception;

/**
 * 参数异常
 *
 * @author Embrace
 */
public final class InvalidServiceException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    /**
     * 错误提示
     */
    private String message;

    /**
     * 错误明细，内部调试错误
     */
    private String detailMessage;

    /**
     * 空构造方法，避免反序列化问题
     */
    public InvalidServiceException() {
    }

    public InvalidServiceException(String message) {
        this.message = message;
    }


    public String getDetailMessage() {
        return detailMessage;
    }

    @Override
    public String getMessage() {
        return message;
    }


    public InvalidServiceException setMessage(String message) {
        this.message = message;
        return this;
    }

    public InvalidServiceException setDetailMessage(String detailMessage) {
        this.detailMessage = detailMessage;
        return this;
    }
}
