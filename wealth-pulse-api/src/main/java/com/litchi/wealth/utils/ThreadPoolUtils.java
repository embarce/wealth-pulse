package com.litchi.wealth.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * @author Embrace
 * @version 1.0.0
 * @ClassName SingleThreadPoolUtlis.java
 * @git https://gitee.com/EmbraceQAQ
 * @createTime 2021年09月03日 17:18:00
 */
@Slf4j
public class ThreadPoolUtils {
    /**
     * 构造一个任务池
     * 参数说明：
     * corePoolSize - 池中所保存的线程数，包括空闲线程。
     * maximumPoolSize - 池中允许的最大线程数。
     * keepAliveTime - 当线程数大于核心时，此为终止前多余的空闲线程等待新任务的最长时间。
     * unit - keepAliveTime 参数的时间单位。
     * workQueue - 执行前用于保持任务的队列。此队列仅保持由 execute 方法提交的 Runnable 任务。
     * threadFactory - 执行程序创建新线程时使用的工厂。
     * handler - 由于超出线程范围和队列容量而使执行被阻塞时所使用的处理程序
     */
    private ThreadPoolExecutor executor = new ThreadPoolExecutor(4, 8, 200, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(1000));

    /**
     * 线程池对象
     */
    private static ThreadPoolUtils instance = null;


    private ThreadPoolUtils() {
    }

    /**
     * 使用线程执行任务
     *
     * @param runnable
     */
    public void executor(Runnable runnable) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            // 注册事务同步器，在事务提交后执行任务
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    executor.execute(runnable);
                }
            });
        } else {
            // 如果没有事务，立即执行
            executor.execute(runnable);
        }
    }

    /**
     * 关闭线程池
     */
    public void shutdown() {
        executor.shutdown();
        log.info("关闭异步线程池");
    }

    /**
     * 获取线程池对象：双锁检查实现线程池
     *
     * @return
     */
    public static ThreadPoolUtils getThreadPool() {
        if (instance == null) {
            synchronized (ThreadPoolUtils.class) {
                if (instance == null) {
                    instance = new ThreadPoolUtils();
                }
            }
        }
        return instance;
    }
}
