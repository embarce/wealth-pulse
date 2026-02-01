package com.litchi.wealth.exception;


import com.litchi.wealth.constant.Result;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Locale;
import java.util.stream.Collectors;

/**
 * @author Embrace
 * @Classname GlobalExceptionHandler
 * @Description GlobalExceptionHandler
 * @Date 2022/9/29 0:10
 * @git: https://github.com/embarce
 */
@ControllerAdvice
@ResponseBody
@Slf4j
public class GlobalExceptionHandler {


    @Autowired
    private MessageSource messageSource;

    @ExceptionHandler(value = Exception.class)
    public Result exceptionHandler(HttpServletRequest request, Exception e) {
        log.error("ERROR Url is {} ", request.getRequestURI(), e);
        return Result.error("System Error");
    }


    @ExceptionHandler(value = ServiceException.class)
    public Result serviceExceptionHandler(HttpServletRequest request, ServiceException e) {
        /**
         * 业务异常返回详细报错
         */
        Integer code = e.getCode();
        if (code == null) {
            code = 500;
        }
        return Result.error(code, e.getMessage());
    }

    /**
     * @RequestBody 上校验失败后抛出的异常是 MethodArgumentNotValidException 异常。
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result handleMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        BindingResult bindingResult = e.getBindingResult();
        String messages = bindingResult.getAllErrors()
                .stream()
                .map(ObjectError::getDefaultMessage)
                .collect(Collectors.joining(";"));
        log.error("handleMethodArgumentNotValidException: {}", messages);
        return Result.error(400, "bad request");
    }

    /**
     * 参数异常
     *
     * @param e
     * @return
     */
    @ExceptionHandler(InvalidServiceException.class)
    public Result handleInvalidServiceException(InvalidServiceException e) {
        log.error("handleInvalidServiceException: {}", e.getMessage());
        return Result.error(400, "bad request");
    }


    /**
     * 不加 @RequestBody注解，校验失败抛出的则是 BindException
     */
    @ExceptionHandler(value = BindException.class)
    public Result exceptionHandler(BindException e) {
        String messages = e.getBindingResult().getAllErrors()
                .stream()
                .map(ObjectError::getDefaultMessage)
                .collect(Collectors.joining(";"));
        log.error("BindException: {}", messages);
        return Result.error(400, "bad request");
    }


    /**
     * @RequestParam 上校验失败后抛出的异常是 ConstraintViolationException
     */
    @ExceptionHandler({ConstraintViolationException.class})
    public Result methodArgumentNotValid(ConstraintViolationException exception) {
        String message = exception.getConstraintViolations().stream().map(ConstraintViolation::getMessage).collect(Collectors.joining("；"));
        log.error("ConstraintViolationException: {}", message);
        Locale locale = LocaleContextHolder.getLocale();
        String greetingMessage = messageSource.getMessage("C00003", null, "System Error", locale);
        return Result.error(400, greetingMessage);
    }


    /**
     * unAuthExceptionHandler
     */
    @ExceptionHandler(value = UnAuthException.class)
    public Result unAuthExceptionHandler(UnAuthException e) {
        return Result.error(401, "Unauthorized");
    }


    /**
     * NoResourceFoundException
     *
     * @param e
     * @return
     */
    @ExceptionHandler(value = NoResourceFoundException.class)
    public Result noResourceFoundException(NoResourceFoundException e) {
        return Result.error(404, "404 not found");
    }
}
