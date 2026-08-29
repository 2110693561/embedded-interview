# Linux 应用开发基础面试题（Q1~Q15）

> 来源: https://wdxzf.github.io/interview/%E5%B5%8C%E5%85%A5%E5%BC%8F%E5%85%AB%E8%82%A1%E6%96%87/06_linux%E5%BA%94%E7%94%A8%E5%BC%80%E5%8F%91%E5%9F%BA%E7%A1%80%E9%9D%A2%E8%AF%95%E9%A2%98
> 抓取时间: 2026-08-28 21:36

# Linux 应用开发基础面试题（Q1~Q15）

> 面向嵌入式 Linux 应用开发岗位，覆盖 Shell 命令、文件 I/O、进程/线程、IPC、网络编程等核心知识。

* * *

## ★ Linux应用开发核心概念图解（先理解原理，再刷面试题）

### ◆ 进程 vs 线程 vs 协程

  * **进程** 像一栋独立的房子——有自己的地址空间(墙壁)、自己的资源(家具)。房子之间互不影响(进程隔离)，但搬家(创建/销毁)很贵。
  * **线程** 像房子里的房间——共享客厅厨房(地址空间/文件描述符)，各自有一张床(栈/寄存器)。同一房子的人交流方便(共享内存)，但容易争抢洗手间(竞争条件)。
  * **协程** 像一个人在多个任务间”手动切换”——做饭等水开的时候去拖地，水开了回来继续做饭。一个线程内协作式调度，没有抢占。


    
    
    1
    
    进程内存布局:
    
    2
    
      ┌───────────────────┐ 高地址
    
    3
    
      │     内核空间       │ 3G~4G (32位系统)
    
    4
    
      ├───────────────────┤
    
    5
    
      │     栈(Stack) ↓   │ 局部变量、函数调用
    
    6
    
      │        ...        │
    
    7
    
      │     堆(Heap) ↑    │ malloc/free
    
    8
    
      ├───────────────────┤
    
    9
    
      │     BSS段         │ 未初始化的全局/静态变量(自动清零)
    
    10
    
      │     数据段(Data)  │ 已初始化的全局/静态变量
    
    11
    
      │     代码段(Text)  │ 程序指令(只读)
    
    12
    
      └───────────────────┘ 低地址
    
    13
    
    
    
    
    14
    
    多线程共享:
    
    15
    
      ┌──────────────────────────────┐
    
    8 collapsed lines
    
    16
    
      │  进程地址空间(共享):          │
    
    17
    
      │  代码段 / 数据段 / 堆 / 文件 │
    
    18
    
      │  ┌─────┐ ┌─────┐ ┌─────┐   │
    
    19
    
      │  │线程1│ │线程2│ │线程3│   │  ← 每个线程独立的:
    
    20
    
      │  │ 栈  │ │ 栈  │ │ 栈  │   │    栈、寄存器、errno、TLS
    
    21
    
      │  │ PC  │ │ PC  │ │ PC  │   │
    
    22
    
      │  └─────┘ └─────┘ └─────┘   │
    
    23
    
      └──────────────────────────────┘

对比项| 进程| 线程| 协程  
---|---|---|---  
地址空间| 独立| 共享| 共享  
创建开销| 大(fork复制页表)| 中(~8KB栈)| 小(~2KB)  
切换开销| 大(TLB刷新)| 中(保存寄存器)| 极小(用户态切换)  
通信方式| 管道/信号/共享内存| 直接读写共享变量| 直接读写  
安全性| 高(隔离)| 低(需加锁)| 低(单线程无竞争)  
调度| 内核调度| 内核调度| 用户态协作式  
  
### ◆ 文件描述符与I/O模型

Terminal window
    
    
    1
    
    5种I/O模型(面试必考):
    
    2
    
    
    
    
    3
    
    1. 阻塞I/O (Blocking)
    
    4
    
       app ──read()──→ kernel ──等数据──→ 复制到用户空间 ──→ 返回
    
    5
    
       └──────────── 阻塞等待 ─────────────────────────────┘
    
    6
    
    
    
    
    7
    
    2. 非阻塞I/O (Non-blocking)
    
    8
    
       app ──read()──→ kernel: 没数据! → 返回EAGAIN
    
    9
    
       app ──read()──→ kernel: 没数据! → 返回EAGAIN  (轮询)
    
    10
    
       app ──read()──→ kernel: 有了! → 复制 → 返回数据
    
    11
    
    
    
    
    12
    
    3. I/O多路复用 (select/poll/epoll)  ★最常考★
    
    13
    
       app ──epoll_wait()──→ kernel: 监控N个fd
    
    14
    
                             ← fd3有数据了!
    
    15
    
       app ──read(fd3)──→ 读取
    
    21 collapsed lines
    
    16
    
    
    
    
    17
    
    4. 信号驱动I/O (SIGIO)
    
    18
    
       注册信号 → kernel有数据时发SIGIO → 回调中read()
    
    19
    
    
    
    
    20
    
    5. 异步I/O (aio_read)
    
    21
    
       app ──aio_read()──→ 立即返回
    
    22
    
       kernel做完所有事(等待+复制) ──→ 通知app
    
    23
    
    
    
    
    24
    
    epoll 为什么比 select 快？
    
    25
    
      select: 每次调用都要把fd集合从用户态拷贝到内核态, O(n)遍历
    
    26
    
      epoll:  fd注册一次到内核(epoll_ctl), 就绪时回调通知, O(1)
    
    27
    
    
    
    
    28
    
      ┌──────────┬──────┬────────┬───────────┐
    
    29
    
      │          │select│ poll   │ epoll     │
    
    30
    
      ├──────────┼──────┼────────┼───────────┤
    
    31
    
      │ fd上限   │ 1024 │ 无限制 │ 无限制    │
    
    32
    
      │ 数据结构 │ 位图 │ 链表   │ 红黑树+链表│
    
    33
    
      │ 消息传递 │ 拷贝 │ 拷贝   │ mmap共享  │
    
    34
    
      │ 复杂度   │ O(n) │ O(n)   │ O(1)      │
    
    35
    
      │ 适合场景 │ 少fd │ 少fd   │ 大量fd★  │
    
    36
    
      └──────────┴──────┴────────┴───────────┘

### ◆ 进程间通信(IPC)全景图
    
    
    1
    
    ┌──────────────────────────────────────────────────────────┐
    
    2
    
    │                    IPC 方式选择                            │
    
    3
    
    ├──────────┬──────────┬───────┬─────────┬─────────────────┤
    
    4
    
    │ 方式     │ 速度     │ 方向  │ 适用    │ 特点             │
    
    5
    
    ├──────────┼──────────┼───────┼─────────┼─────────────────┤
    
    6
    
    │ 管道pipe │ 中       │ 单向  │ 父子进程│ 简单,4KB缓冲    │
    
    7
    
    │ FIFO     │ 中       │ 单向  │ 任意进程│ 有名管道,文件系统│
    
    8
    
    │ 信号signal│ 快      │ 异步  │ 任意进程│ 只传信号号,不传数据│
    
    9
    
    │ 消息队列 │ 中       │ 双向  │ 任意进程│ 有格式,内核维护  │
    
    10
    
    │ 共享内存 │ ★最快   │ 双向  │ 任意进程│ 需同步机制(信号量)│
    
    11
    
    │ 信号量sem│ —       │ 同步  │ 任意进程│ 不传数据,只做同步│
    
    12
    
    │ Socket   │ 慢       │ 双向  │ 可跨网络│ 最通用,TCP/UDP  │
    
    13
    
    │ mmap     │ 快       │ 双向  │ 任意进程│ 文件映射到内存   │
    
    14
    
    └──────────┴──────────┴───────┴─────────┴─────────────────┘
    
    15
    
    
    
    
    5 collapsed lines
    
    16
    
    嵌入式中最常考:
    
    17
    
      进程间大数据传输 → 共享内存 + 信号量同步
    
    18
    
      父子进程通信 → 管道(pipe)
    
    19
    
      网络通信 → Socket
    
    20
    
      简单通知 → 信号(signal)

### ◆ 线程同步四件套

Terminal window
    
    
    1
    
    1. 互斥锁(Mutex): 保证临界区互斥访问(一次只一个线程)
    
    2
    
       pthread_mutex_lock(&mtx);
    
    3
    
       // 临界区: 操作共享资源
    
    4
    
       pthread_mutex_unlock(&mtx);
    
    5
    
    
    
    
    6
    
    2. 条件变量(Cond): 等待某个条件满足(生产者-消费者模型)
    
    7
    
       // 消费者:
    
    8
    
       pthread_mutex_lock(&mtx);
    
    9
    
       while (queue_empty()) {  // ★必须用while不用if(防虚假唤醒)
    
    10
    
           pthread_cond_wait(&cond, &mtx);  // 原子地释放锁+等待
    
    11
    
       }
    
    12
    
       // 消费数据
    
    13
    
       pthread_mutex_unlock(&mtx);
    
    14
    
    
    
    
    15
    
       // 生产者:
    
    22 collapsed lines
    
    16
    
       pthread_mutex_lock(&mtx);
    
    17
    
       // 生产数据
    
    18
    
       pthread_cond_signal(&cond);  // 唤醒一个等待线程
    
    19
    
       pthread_mutex_unlock(&mtx);
    
    20
    
    
    
    
    21
    
    3. 读写锁(RWLock): 读多写少场景优化
    
    22
    
       多个读者可同时持锁, 写者独占
    
    23
    
       pthread_rwlock_rdlock() / pthread_rwlock_wrlock()
    
    24
    
    
    
    
    25
    
    4. 自旋锁(Spinlock): 忙等待,不睡眠(适合极短临界区)
    
    26
    
       pthread_spin_lock(&spin);
    
    27
    
       // 极短操作
    
    28
    
       pthread_spin_unlock(&spin);
    
    29
    
    
    
    
    30
    
      ┌──────────┬──────────┬───────────┬──────────┐
    
    31
    
      │          │ 互斥锁   │ 读写锁    │ 自旋锁   │
    
    32
    
      ├──────────┼──────────┼───────────┼──────────┤
    
    33
    
      │ 等待方式 │ 睡眠      │ 睡眠      │ 忙等待   │
    
    34
    
      │ 适合场景 │ 通用      │ 读多写少  │ 极短临界区│
    
    35
    
      │ 开销     │ 中(上下文)│ 中        │ 低(但占CPU)│
    
    36
    
      │ 优先级反转│ 可能     │ 可能      │ 可能      │
    
    37
    
      └──────────┴──────────┴───────────┴──────────┘

* * *

## 一、Linux 基础命令（Q1~Q15）

### Q1: 常用文件操作命令？

> 🧠 **秒懂：** ls/cp/mv/rm/find/chmod/chown是Linux文件操作的基本功。find + xargs组合是批量处理的利器。嵌入式开发中经常用这些命令操作交叉编译产物和设备文件。

以下是常用命令及其典型用法：

Terminal window
    
    
    1
    
    ls -la          # 列出所有文件(含隐藏), 显示详细信息
    
    2
    
    cd /path        # 切换目录
    
    3
    
    pwd             # 显示当前目录
    
    4
    
    cp -r src dst   # 递归复制
    
    5
    
    mv old new      # 移动/重命名
    
    6
    
    rm -rf dir      # 强制递归删除(危险!)
    
    7
    
    mkdir -p a/b/c  # 递归创建目录
    
    8
    
    touch file      # 创建空文件 / 更新时间戳
    
    9
    
    cat file        # 显示文件内容
    
    10
    
    find / -name "*.c"   # 按文件名查找
    
    11
    
    which gcc       # 查找可执行文件路径

**Linux IPC机制对比速查表：**

IPC方式| 数据方向| 速度| 适用场景| 关键API  
---|---|---|---|---  
管道(pipe)| 单向| 中| 父子进程简单通信| pipe()+read/write  
命名管道(FIFO)| 单向| 中| 无亲缘关系进程| mkfifo()+open  
消息队列| 双向| 中| 带类型的结构化消息| msgget/msgsnd/msgrcv  
共享内存| 双向| 最快| 大量数据高速共享| shmget/shmat+信号量同步  
信号量| 同步控制| 快| 进程间互斥/同步| semget/semop  
信号(signal)| 异步通知| 快| 异常通知/进程控制| kill/signal/sigaction  
Socket| 双向| 中| 跨主机/同主机通用| socket/bind/listen  
mmap| 双向| 最快| 文件映射/零拷贝| mmap/munmap  
  
* * *

### Q2: 文件权限 rwx？

> 🧠 **秒懂：** rwx分别代表读(4)、写(2)、执行(1)，三组分别给属主/属组/其他人。chmod 755表示属主rwx、其他rx。嵌入式中注意设备文件和脚本的执行权限。
    
    
    1
    
    -rwxr-xr-- 1 user group 1234 Jan 1 file.txt
    
    2
    
    │└┬┘└┬┘└┬┘
    
    3
    
    │ │   │   └── 其他用户: r-- (只读)
    
    4
    
    │ │   └────── 组用户:   r-x (读+执行)
    
    5
    
    │ └────────── 属主:     rwx (读+写+执行)
    
    6
    
    └──────────── 文件类型: - 普通, d 目录, l 链接
    
    7
    
    
    
    
    8
    
    权限数字表示: r=4, w=2, x=1
    
    9
    
      chmod 755 file  →  rwxr-xr-x (属主全权限, 其他读+执行)
    
    10
    
      chmod 644 file  →  rw-r--r-- (属主读写, 其他只读)

* * *

> 💡 **面试追问：** 进程/线程/协程的区别？线程共享什么？创建线程的开销是多少？ 🔧 **嵌入式建议：** 嵌入式Linux多线程:主线程管事件循环,工作线程处理业务。线程数不宜太多(一般4-8个)。

* * *

#### 📊 进程间通信(IPC)方式对比

方式| 方向| 速度| 适用场景| 备注  
---|---|---|---|---  
管道(pipe)| 单向| 中| 父子进程| 半双工  
命名管道(FIFO)| 单向| 中| 无亲缘进程| 文件系统可见  
消息队列| 双向| 中| 带类型的消息| 有大小限制  
共享内存| 双向| ⭐最快| 大量数据交换| 需要同步保护  
信号(signal)| 单向| 快(异步)| 事件通知| 信息量少  
Socket| 双向| 中| 跨主机/通用| 开销较大  
信号量| N/A| -| 同步/互斥| 不传数据  
  
* * *

### Q3: 常用文本处理命令？

> 🧠 **秒懂：** grep搜索文本、sed流编辑、awk列处理、sort排序、uniq去重、wc统计。嵌入式开发中常用grep+awk分析日志、sed批量修改配置文件。

以下是常用命令及其典型用法：

Terminal window
    
    
    1
    
    grep "pattern" file      # 搜索文本
    
    2
    
    grep -rn "func" src/     # 递归搜索, 显示行号
    
    3
    
    sed 's/old/new/g' file   # 替换文本
    
    4
    
    awk '{print $1}' file    # 按列处理
    
    5
    
    sort file                # 排序
    
    6
    
    uniq -c                  # 去重并计数
    
    7
    
    wc -l file               # 统计行数
    
    8
    
    head -20 file            # 前20行
    
    9
    
    tail -f log.txt          # 实时跟踪日志
    
    10
    
    cut -d: -f1 /etc/passwd  # 按分隔符取列

* * *

### Q4: 进程相关命令？

> 🧠 **秒懂：** ps查看进程、top动态监控、kill发信号、nice调优先级、strace跟踪系统调用。嵌入式调试中ps aux查看进程状态，top查看CPU/内存占用。

相关Linux命令速查：

Terminal window
    
    
    1
    
    ps aux           # 查看所有进程
    
    2
    
    top / htop       # 动态进程监控
    
    3
    
    kill -9 PID      # 强制杀进程
    
    4
    
    kill -15 PID     # 温和终止(SIGTERM)
    
    5
    
    jobs             # 查看后台任务
    
    6
    
    bg / fg          # 切换前后台
    
    7
    
    nohup cmd &      # 后台运行不受终端关闭影响
    
    8
    
    strace -p PID    # 跟踪系统调用(调试神器)
    
    9
    
    lsof -i :8080    # 查看端口被谁占用

* * *

> 💡 **面试追问：** select/poll/epoll谁最好？epoll为什么快？epoll的ET和LT模式区别？ 🔧 **嵌入式建议：** 嵌入式网络服务首选epoll+非阻塞IO。ET模式要循环读到EAGAIN;LT模式可读就通知(更安全)。

* * *

#### 📊 IO多路复用对比表

机制| 最大fd数| 数据结构| 触发方式| 效率| 适用场景  
---|---|---|---|---|---  
select| 1024(FD_SETSIZE)| fd_set位图| 水平触发| O(n)轮询| 小规模/跨平台  
poll| 无限制| pollfd数组| 水平触发| O(n)轮询| 中规模  
epoll| 无限制| 红黑树+就绪链表| 水平/边沿| O(1)就绪事件| ⭐大规模/Linux  
  
> 💡 边沿触发(ET)性能更好但必须一次读完,水平触发(LT)更安全但通知更频繁

* * *

### Q5: GCC 编译选项？

> 🧠 **秒懂：** 常用选项：-Wall(全警告) -Werror(警告当错误) -O2/-Os(优化) -g(调试信息) -I(头文件路径) -L -l(库路径和库名) -static(静态链接) -march(目标架构)。

Terminal window
    
    
    1
    
    gcc -Wall -Wextra    # 开启所有警告
    
    2
    
    gcc -O0              # 不优化(调试用)
    
    3
    
    gcc -O2              # 常用优化级别
    
    4
    
    gcc -g               # 生成调试信息(配合GDB)
    
    5
    
    gcc -I./include      # 添加头文件搜索路径
    
    6
    
    gcc -L./lib          # 添加库文件搜索路径
    
    7
    
    gcc -lm              # 链接 libm.so (数学库)
    
    8
    
    gcc -static          # 静态链接(不依赖动态库)
    
    9
    
    gcc -shared -fPIC    # 生成动态库
    
    10
    
    gcc -DDEBUG          # 定义宏 DEBUG=1
    
    11
    
    gcc -std=c11         # 指定C标准
    
    12
    
    
    
    
    13
    
    # 完整编译流程:
    
    14
    
    gcc -E file.c -o file.i   # 预处理
    
    15
    
    gcc -S file.i -o file.s   # 编译为汇编
    
    2 collapsed lines
    
    16
    
    gcc -c file.s -o file.o   # 汇编为目标文件
    
    17
    
    gcc file.o -o app          # 链接为可执行文件

* * *

### Q6: Makefile 基本语法？

> 🧠 **秒懂：** Makefile定义编译规则：目标:依赖→命令。变量(CC/CFLAGS)、自动变量($@目标/$<第一依赖/$^所有依赖)、%.o:%.c模式规则。是嵌入式项目构建的基础。

Makefile的基本语法规则如下：
    
    
    1
    
    # 变量
    
    2
    
    CC = gcc
    
    3
    
    CFLAGS = -Wall -g
    
    4
    
    SRCS = $(wildcard src/*.c)
    
    5
    
    OBJS = $(SRCS:.c=.o)
    
    6
    
    
    
    
    7
    
    # 目标: 依赖
    
    8
    
    #     命令(必须Tab开头)
    
    9
    
    app: $(OBJS)
    
    10
    
    $(CC) $(CFLAGS) -o $@ $^
    
    11
    
    
    
    
    12
    
    # 模式规则
    
    13
    
    %.o: %.c
    
    14
    
    $(CC) $(CFLAGS) -c -o $@ $<
    
    15
    
    
    
    
    9 collapsed lines
    
    16
    
    # 伪目标
    
    17
    
    .PHONY: clean
    
    18
    
    clean:
    
    19
    
    rm -f $(OBJS) app
    
    20
    
    
    
    
    21
    
    # 自动变量:
    
    22
    
    # $@ = 目标名
    
    23
    
    # $< = 第一个依赖
    
    24
    
    # $^ = 所有依赖

* * *

### Q7: 静态库(.a)和动态库(.so)？

> 🧠 **秒懂：** 静态库(.a)在链接时合并进可执行文件(体积大但不依赖外部库)。动态库(.so)在运行时加载(体积小但需要部署库文件)。嵌入式资源受限时常用静态链接。

静态库在编译时链接，动态库在运行时加载：

Terminal window
    
    
    1
    
    # 创建静态库
    
    2
    
    gcc -c mylib.c -o mylib.o
    
    3
    
    ar rcs libmylib.a mylib.o      # 打包为 .a
    
    4
    
    gcc main.c -L. -lmylib -o app  # 链接(代码复制到可执行文件)
    
    5
    
    
    
    
    6
    
    # 创建动态库
    
    7
    
    gcc -shared -fPIC mylib.c -o libmylib.so
    
    8
    
    gcc main.c -L. -lmylib -o app
    
    9
    
    export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH  # 运行时找到库
    
    10
    
    
    
    
    11
    
    #  对比:
    
    12
    
    # 静态库: 编译时嵌入, 可执行文件大, 不依赖外部
    
    13
    
    # 动态库: 运行时加载, 可执行文件小, 多程序共享, 升级方便

* * *

### Q8: 环境变量？

> 🧠 **秒懂：** PATH(可执行文件搜索路径)、LD_LIBRARY_PATH(动态库路径)、HOME、CROSS_COMPILE(交叉编译前缀)。export设置环境变量，source .bashrc使其生效。

环境变量影响进程的运行行为：

Terminal window
    
    
    1
    
    echo $PATH               # 可执行文件搜索路径
    
    2
    
    echo $LD_LIBRARY_PATH    # 动态库搜索路径
    
    3
    
    echo $HOME               # 用户主目录
    
    4
    
    export VAR=value         # 设置环境变量(当前shell及子进程)
    
    5
    
    env                      # 查看所有环境变量
    
    6
    
    
    
    
    7
    
    # 永久生效: 写入 ~/.bashrc 或 /etc/profile
    
    8
    
    # C 程序中获取:
    
    9
    
    # char *val = getenv("PATH");

* * *

### Q9: 管道和重定向？

> 🧠 **秒懂：** 管道(|)将前一个命令的stdout连接到下一个的stdin。重定向(>/>>/<)将IO连接到文件。2>&1将stderr合并到stdout。嵌入式日志经常用重定向保存。

Linux管道和重定向是Shell编程的基础，也是日常开发必用：

Terminal window
    
    
    1
    
    cmd1 | cmd2         # 管道: cmd1 标准输出 → cmd2 标准输入
    
    2
    
    cmd > file          # 重定向标准输出到文件(覆盖)
    
    3
    
    cmd >> file         # 追加
    
    4
    
    cmd 2> err.log      # 重定向标准错误
    
    5
    
    cmd > out 2>&1      # 标准输出和错误都到 out
    
    6
    
    cmd < input.txt     # 文件作为标准输入
    
    7
    
    
    
    
    8
    
    # 高级用法:
    
    9
    
    ls /not_exist 2>/dev/null  # 丢弃错误信息
    
    10
    
    tee file                   # 同时输出到屏幕和文件

* * *

### Q10: Shell脚本基础语法？

> 🧠 **秒懂：** #!/bin/bash开头、变量无需声明、$1-$9获取参数、if/for/while/case控制流、$(command)命令替换。嵌入式中Shell脚本用于自动化测试和系统初始化。

Shell脚本是嵌入式Linux开发中自动化测试、系统配置的基本工具：
    
    
    1
    
    #!/bin/bash
    
    2
    
    # 变量
    
    3
    
    NAME="embedded"
    
    4
    
    echo "Hello $NAME"    # 双引号内变量展开
    
    5
    
    echo 'Hello $NAME'    # 单引号内原样输出
    
    6
    
    
    
    
    7
    
    # 条件判断
    
    8
    
    if [ -f /etc/passwd ]; then
    
    9
    
        echo "File exists"
    
    10
    
    elif [ -d /tmp ]; then
    
    11
    
        echo "Dir exists"
    
    12
    
    fi
    
    13
    
    
    
    
    14
    
    # 循环
    
    15
    
    for i in 1 2 3; do
    
    16 collapsed lines
    
    16
    
        echo "num: $i"
    
    17
    
    done
    
    18
    
    
    
    
    19
    
    # while循环读文件
    
    20
    
    while read line; do
    
    21
    
        echo "$line"
    
    22
    
    done < file.txt
    
    23
    
    
    
    
    24
    
    # 函数
    
    25
    
    check_process() {
    
    26
    
        if ps aux | grep -q "$1"; then
    
    27
    
            return 0
    
    28
    
        fi
    
    29
    
        return 1
    
    30
    
    }
    
    31
    
    check_process "myapp" && echo "Running"

### Q11: Linux下如何调试段错误(Segmentation Fault)？

> 🧠 **秒懂：** ①GDB定位(bt查看调用栈)→②dmesg查看内核崩溃信息→③开启core dump(ulimit -c unlimited)→④GDB分析core文件→⑤ASAN编译检测。段错误通常是空指针或越界。

段错误是嵌入式开发中最常见的崩溃问题，调试方法如下：

Terminal window
    
    
    1
    
    # 方法1：GDB直接调试
    
    2
    
    gcc -g program.c -o program
    
    3
    
    gdb ./program
    
    4
    
    (gdb) run
    
    5
    
    # 崩溃后自动停在出错位置
    
    6
    
    (gdb) bt         # 打印调用栈
    
    7
    
    (gdb) info locals # 查看局部变量
    
    8
    
    
    
    
    9
    
    # 方法2：Core dump分析
    
    10
    
    ulimit -c unlimited          # 开启core dump
    
    11
    
    ./program                    # 崩溃后生成core文件
    
    12
    
    gdb ./program core           # 分析core
    
    13
    
    (gdb) bt                     # 看崩溃调用栈
    
    14
    
    
    
    
    15
    
    # 方法3：AddressSanitizer(推荐)
    
    3 collapsed lines
    
    16
    
    gcc -fsanitize=address -g program.c -o program
    
    17
    
    ./program
    
    18
    
    # 会精确报告内存错误位置

**常见段错误原因：**

  * 空指针解引用
  * 数组越界
  * 已释放内存再访问(use-after-free)
  * 栈溢出(递归太深/局部大数组)



### Q12: strace和ltrace的用法？

> 🧠 **秒懂：** strace跟踪系统调用(如open/read/write/ioctl的参数和返回值)。ltrace跟踪动态库函数调用。嵌入式中strace -e trace=open定位文件访问问题特别有用。

strace跟踪系统调用，ltrace跟踪库函数调用，是排查问题的利器：

Terminal window
    
    
    1
    
    # strace - 跟踪系统调用
    
    2
    
    strace ./myapp                   # 跟踪所有系统调用
    
    3
    
    strace -e open,read,write ./myapp  # 只看指定的
    
    4
    
    strace -p <pid>                  # 附加到运行中的进程
    
    5
    
    strace -c ./myapp                # 统计系统调用次数和耗时
    
    6
    
    
    
    
    7
    
    # ltrace - 跟踪动态库调用
    
    8
    
    ltrace ./myapp                   # 跟踪所有库函数调用
    
    9
    
    ltrace -e malloc,free ./myapp    # 只看内存分配
    
    10
    
    
    
    
    11
    
    # 实际排错示例：程序打开文件失败
    
    12
    
    strace -e open,openat ./myapp 2>&1 | grep "No such"
    
    13
    
    # 输出: openat(AT_FDCWD, "/etc/myapp.conf", O_RDONLY) = -1 ENOENT

### Q13: /proc文件系统在调试中的应用？

> 🧠 **秒懂：** /proc/PID/maps(内存映射)、/proc/PID/status(进程状态)、/proc/PID/fd(打开的文件描述符)、/proc/meminfo(系统内存)。不需要额外工具就能获取丰富的调试信息。

/proc是内核暴露到用户态的信息接口，嵌入式调试经常使用：

Terminal window
    
    
    1
    
    # 进程相关
    
    2
    
    cat /proc/<pid>/maps      # 内存映射(查找内存布局)
    
    3
    
    cat /proc/<pid>/status    # 进程状态(内存/线程数)
    
    4
    
    cat /proc/<pid>/fd/       # 打开的文件描述符
    
    5
    
    cat /proc/<pid>/stack     # 内核栈(需要root)
    
    6
    
    cat /proc/<pid>/cmdline   # 启动命令行
    
    7
    
    
    
    
    8
    
    # 系统信息
    
    9
    
    cat /proc/meminfo         # 内存总体使用
    
    10
    
    cat /proc/cpuinfo         # CPU信息
    
    11
    
    cat /proc/interrupts      # 中断统计
    
    12
    
    cat /proc/version         # 内核版本
    
    13
    
    cat /proc/uptime          # 运行时间

### Q14: 什么是交叉编译？嵌入式开发为什么需要？

> 🧠 **秒懂：** 交叉编译是在PC(x86)上编译能在目标板(ARM)运行的程序。因为目标板资源有限跑不了编译器。工具链如arm-linux-gnueabihf-gcc。嵌入式开发的必备技能。

交叉编译是在一种平台(Host)上编译出另一种平台(Target)运行的程序：

Terminal window
    
    
    1
    
    # 典型交叉编译工具链命名: arch-vendor-os-abi-tool
    
    2
    
    arm-linux-gnueabihf-gcc hello.c -o hello   # ARM Linux
    
    3
    
    arm-none-eabi-gcc bare.c -o bare.elf       # ARM裸机(无OS)
    
    4
    
    aarch64-linux-gnu-gcc app.c -o app         # ARM64 Linux
    
    5
    
    
    
    
    6
    
    # 为什么需要交叉编译:
    
    7
    
    # 1. 目标设备(MCU/ARM板)资源不足以运行编译器
    
    8
    
    # 2. 编译速度: PC上编译比目标板快得多
    
    9
    
    # 3. 开发便利: 在PC上编辑/编译/调试
    
    10
    
    
    
    
    11
    
    # 交叉编译Makefile示例
    
    12
    
    CROSS_COMPILE = arm-linux-gnueabihf-
    
    13
    
    CC = $(CROSS_COMPILE)gcc
    
    14
    
    CFLAGS = -Wall -O2
    
    15
    
    TARGET = myapp
    
    3 collapsed lines
    
    16
    
    
    
    
    17
    
    $(TARGET): main.c
    
    18
    
      $(CC) $(CFLAGS) $< -o $@

### Q15: GDB远程调试的方法？

> 🧠 **秒懂：** 目标板运行gdbserver监听端口→PC的GDB用target remote ip
> 
> 连接→即可远程设断点、单步、查看变量。嵌入式Linux调试的标准方法。

嵌入式开发中通过GDB远程连接目标板进行调试：

Terminal window
    
    
    1
    
    # 目标板上运行gdbserver
    
    2
    
    gdbserver :1234 ./myapp          # 启动程序等待连接
    
    3
    
    gdbserver --attach :1234 <pid>   # 附加到运行中的进程
    
    4
    
    
    
    
    5
    
    # PC上用交叉GDB连接
    
    6
    
    arm-linux-gnueabihf-gdb ./myapp
    
    7
    
    (gdb) target remote 192.168.1.100:1234
    
    8
    
    (gdb) break main
    
    9
    
    (gdb) continue
    
    10
    
    (gdb) bt
    
    11
    
    (gdb) info threads

**也可用JTAG/SWD调试(裸机/RTOS)：**

  * J-Link + GDB Server
  * OpenOCD + GDB



* * *

## 二、文件IO操作（Q16~Q30）

### Q16: open/read/write/close系统调用？

> 🧠 **秒懂：** open返回文件描述符(fd)→read/write通过fd读写数据→close关闭fd释放资源。底层系统调用，不带缓冲。返回-1表示错误，必须检查errno。

文件IO是Linux应用层最基础的操作：
    
    
    1
    
    #include <fcntl.h>
    
    2
    
    #include <unistd.h>
    
    3
    
    
    
    
    4
    
    // 打开文件
    
    5
    
    int fd = open("/tmp/test.txt", O_RDWR | O_CREAT | O_TRUNC, 0644);
    
    6
    
    if (fd < 0) {
    
    7
    
        perror("open");
    
    8
    
        return -1;
    
    9
    
    }
    
    10
    
    
    
    
    11
    
    // 写入
    
    12
    
    const char *msg = "Hello\n";
    
    13
    
    ssize_t n = write(fd, msg, strlen(msg));
    
    14
    
    
    
    
    15
    
    // 定位
    
    8 collapsed lines
    
    16
    
    lseek(fd, 0, SEEK_SET);  // 回到文件开头
    
    17
    
    
    
    
    18
    
    // 读取
    
    19
    
    char buf[64];
    
    20
    
    n = read(fd, buf, sizeof(buf) - 1);
    
    21
    
    buf[n] = '\0';
    
    22
    
    
    
    
    23
    
    close(fd);

**open的flags：**

  * O_RDONLY/O_WRONLY/O_RDWR: 访问模式
  * O_CREAT: 不存在则创建
  * O_TRUNC: 存在则清空
  * O_APPEND: 追加写
  * O_NONBLOCK: 非阻塞



### Q17: 标准IO(fopen/fread)和系统IO(open/read)的区别？

> 🧠 **秒懂：** 标准IO(fopen/fread)带用户态缓冲区(减少系统调用次数)，系统IO(open/read)直接调用内核。标准IO效率更高(批量I/O)，系统IO控制更精细(无缓冲延迟)。

标准IO在系统IO之上加了用户态缓冲层：

对比项| 标准IO(FILE*)| 系统IO(fd)  
---|---|---  
缓冲| 有(全缓冲/行缓冲/无缓冲)| 无用户态缓冲  
开销| 减少系统调用(攒满buffer再write)| 每次调用都进入内核  
可移植| C标准,跨平台| POSIX,仅Unix系  
适用| 普通文件IO| 设备文件/Socket/低层IO  
      
    
    1
    
    // 标准IO的缓冲模式
    
    2
    
    setvbuf(fp, NULL, _IOFBF, 4096);  // 全缓冲(文件)
    
    3
    
    setvbuf(fp, NULL, _IOLBF, 0);     // 行缓冲(终端stdout)
    
    4
    
    setvbuf(fp, NULL, _IONBF, 0);     // 无缓冲(stderr)

### Q18: 文件描述符的复制(dup/dup2)？

> 🧠 **秒懂：** dup(oldfd)复制fd到最小可用fd号，dup2(oldfd, newfd)复制到指定fd号。经典用法：dup2(pipefd, STDOUT_FILENO)实现重定向——printf的输出就走管道了。

dup/dup2用于复制文件描述符，经典应用是重定向：
    
    
    1
    
    #include <unistd.h>
    
    2
    
    #include <fcntl.h>
    
    3
    
    
    
    
    4
    
    // 输出重定向到文件(printf输出到文件)
    
    5
    
    int fd = open("output.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    
    6
    
    int old_stdout = dup(STDOUT_FILENO);   // 备份stdout
    
    7
    
    dup2(fd, STDOUT_FILENO);               // 将fd复制到1号(stdout)
    
    8
    
    close(fd);
    
    9
    
    
    
    
    10
    
    printf("This goes to file\n");        // 输出到output.txt
    
    11
    
    
    
    
    12
    
    // 恢复stdout
    
    13
    
    dup2(old_stdout, STDOUT_FILENO);
    
    14
    
    close(old_stdout);
    
    15
    
    printf("Back to terminal\n");

### Q19: fcntl和ioctl的区别？

> 🧠 **秒懂：** fcntl操作文件描述符属性(设置非阻塞、文件锁等)。ioctl操作设备(设置串口波特率、控制外设等)。fcntl是通用文件操作，ioctl是设备特定控制——记住这个区别。

两者都用于控制文件描述符，但层级和用途不同：

对比项| fcntl| ioctl  
---|---|---  
级别| 通用文件描述符操作| 设备特定操作  
标准化| POSIX标准| 设备驱动自定义  
典型用途| 文件锁、fd属性、非阻塞设置| 设备控制(如串口波特率)  
      
    
    1
    
    // fcntl: 设置非阻塞
    
    2
    
    int flags = fcntl(fd, F_GETFL);
    
    3
    
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
    
    4
    
    
    
    
    5
    
    // ioctl: 设置串口波特率
    
    6
    
    struct termios tio;
    
    7
    
    tcgetattr(fd, &tio);
    
    8
    
    cfsetispeed(&tio, B115200);
    
    9
    
    cfsetospeed(&tio, B115200);
    
    10
    
    tcsetattr(fd, TCSANOW, &tio);

### Q20: mmap内存映射文件的使用？

> 🧠 **秒懂：** mmap将文件映射到进程地址空间→普通的指针读写等于文件IO→munmap解除映射。零拷贝、高效。嵌入式中mmap常用于访问设备寄存器(/dev/mem)和进程间共享内存。

mmap将文件直接映射到进程地址空间，读写内存=读写文件：
    
    
    1
    
    #include <sys/mman.h>
    
    2
    
    #include <fcntl.h>
    
    3
    
    
    
    
    4
    
    int fd = open("data.bin", O_RDWR);
    
    5
    
    struct stat st;
    
    6
    
    fstat(fd, &st);
    
    7
    
    
    
    
    8
    
    // 映射整个文件到内存
    
    9
    
    char *addr = mmap(NULL, st.st_size, PROT_READ | PROT_WRITE,
    
    10
    
                      MAP_SHARED, fd, 0);
    
    11
    
    if (addr == MAP_FAILED) {
    
    12
    
        perror("mmap");
    
    13
    
        return -1;
    
    14
    
    }
    
    15
    
    
    
    
    6 collapsed lines
    
    16
    
    // 直接通过指针操作文件内容
    
    17
    
    addr[0] = 'A';  // 修改会同步到文件(MAP_SHARED)
    
    18
    
    
    
    
    19
    
    // 解除映射
    
    20
    
    munmap(addr, st.st_size);
    
    21
    
    close(fd);

**mmap vs read/write：**

  * mmap优势：大文件随机访问、零拷贝(内核与用户态共享物理页)
  * read优势：顺序小文件、代码简单



### Q21: select/poll/epoll的使用场景？

> 🧠 **秒懂：** select适合少量fd(≤1024)的简单场景。poll去掉了fd数量限制但仍需遍历。epoll基于事件驱动(O(1))适合大量连接。嵌入式Linux网络服务用epoll是标准实践。

IO多路复用让单线程同时等待多个fd事件：
    
    
    1
    
    // epoll基本使用(嵌入式网络编程首选)
    
    2
    
    #include <sys/epoll.h>
    
    3
    
    
    
    
    4
    
    int epfd = epoll_create1(0);
    
    5
    
    
    
    
    6
    
    struct epoll_event ev;
    
    7
    
    ev.events = EPOLLIN;
    
    8
    
    ev.data.fd = listen_fd;
    
    9
    
    epoll_ctl(epfd, EPOLL_CTL_ADD, listen_fd, &ev);
    
    10
    
    
    
    
    11
    
    struct epoll_event events[64];
    
    12
    
    while (1) {
    
    13
    
        int n = epoll_wait(epfd, events, 64, -1);
    
    14
    
        for (int i = 0; i < n; i++) {
    
    15
    
            if (events[i].data.fd == listen_fd) {
    
    11 collapsed lines
    
    16
    
                // 新连接
    
    17
    
                int client = accept(listen_fd, NULL, NULL);
    
    18
    
                ev.events = EPOLLIN;
    
    19
    
                ev.data.fd = client;
    
    20
    
                epoll_ctl(epfd, EPOLL_CTL_ADD, client, &ev);
    
    21
    
            } else {
    
    22
    
                // 数据可读
    
    23
    
                handle_client(events[i].data.fd);
    
    24
    
            }
    
    25
    
        }
    
    26
    
    }

### Q22: 文件锁(flock/fcntl锁)的使用？

> 🧠 **秒懂：** flock整文件加锁(简单)，fcntl锁可以锁文件的某段区域(字节范围锁)。文件锁用于多进程访问同一个文件时的同步。嵌入式配置文件修改、日志写入等场景会用到。

文件锁用于多进程协调访问同一文件：
    
    
    1
    
    #include <fcntl.h>
    
    2
    
    
    
    
    3
    
    int fd = open("shared.dat", O_RDWR);
    
    4
    
    
    
    
    5
    
    // 方法1: flock(整个文件锁)
    
    6
    
    flock(fd, LOCK_EX);   // 加排他锁(阻塞等)
    
    7
    
    // ... 操作文件 ...
    
    8
    
    flock(fd, LOCK_UN);   // 解锁
    
    9
    
    
    
    
    10
    
    // 方法2: fcntl(可锁文件区域)
    
    11
    
    struct flock fl;
    
    12
    
    fl.l_type = F_WRLCK;     // 写锁
    
    13
    
    fl.l_whence = SEEK_SET;
    
    14
    
    fl.l_start = 0;          // 从文件开始
    
    15
    
    fl.l_len = 100;          // 锁前100字节
    
    4 collapsed lines
    
    16
    
    fcntl(fd, F_SETLKW, &fl);  // 加锁(W=阻塞等待)
    
    17
    
    // ... 操作 ...
    
    18
    
    fl.l_type = F_UNLCK;
    
    19
    
    fcntl(fd, F_SETLK, &fl);   // 解锁

### Q23: inotify文件系统事件监控？

> 🧠 **秒懂：** inotify监控文件/目录的创建、删除、修改、移动等事件。inotify_init→inotify_add_watch→read事件。嵌入式中用于监控配置文件变化或热插拔设备节点。

inotify可以监控文件/目录的变化，嵌入式中用于配置文件热加载：
    
    
    1
    
    // 关键系统调用示例(见各函数注释)
    
    2
    
    #include <sys/inotify.h>
    
    3
    
    
    
    
    4
    
    int ifd = inotify_init();
    
    5
    
    int wd = inotify_add_watch(ifd, "/etc/myapp.conf",
    
    6
    
                               IN_MODIFY | IN_DELETE);
    
    7
    
    
    
    
    8
    
    char buf[4096];
    
    9
    
    while (1) {
    
    10
    
        int len = read(ifd, buf, sizeof(buf));
    
    11
    
        struct inotify_event *event;
    
    12
    
        for (char *ptr = buf; ptr < buf + len;
    
    13
    
             ptr += sizeof(*event) + event->len) {
    
    14
    
            event = (struct inotify_event *)ptr;
    
    15
    
            if (event->mask & IN_MODIFY)
    
    3 collapsed lines
    
    16
    
                reload_config();
    
    17
    
        }
    
    18
    
    }

### Q24: Linux下大文件的处理方法？

> 🧠 **秒懂：** 大文件处理：mmap分段映射、使用O_LARGEFILE标志、fseeko支持64位偏移、sendfile零拷贝传输。编译时定义_FILE_OFFSET_BITS=64启用大文件支持。

嵌入式设备可能需要处理日志等大文件：
    
    
    1
    
    // 方法1: mmap分段映射
    
    2
    
    #define MAP_SIZE (4*1024*1024)  // 每次映射4MB
    
    3
    
    off_t offset = 0;
    
    4
    
    while (offset < file_size) {
    
    5
    
        size_t len = MIN(MAP_SIZE, file_size - offset);
    
    6
    
        char *addr = mmap(NULL, len, PROT_READ, MAP_SHARED, fd, offset);
    
    7
    
        process_chunk(addr, len);
    
    8
    
        munmap(addr, len);
    
    9
    
        offset += len;
    
    10
    
    }
    
    11
    
    
    
    
    12
    
    // 方法2: sendfile零拷贝传输
    
    13
    
    #include <sys/sendfile.h>
    
    14
    
    off_t off = 0;
    
    15
    
    sendfile(out_fd, in_fd, &off, file_size);

### Q25: /dev/null和/dev/zero的作用？

> 🧠 **秒懂：** /dev/null是黑洞(写入的数据全丢弃)，用于丢弃不需要的输出。/dev/zero是零源(读出的全是0)，用于初始化内存或创建空文件。嵌入式测试中经常用到。

这两个特殊设备文件在嵌入式开发中经常使用：

Terminal window
    
    
    1
    
    # /dev/null - 数据黑洞(丢弃所有写入)
    
    2
    
    ./noisy_program > /dev/null 2>&1   # 丢弃所有输出
    
    3
    
    cat /dev/null > file.txt           # 清空文件
    
    4
    
    
    
    
    5
    
    # /dev/zero - 零字节源(读取返回全0)
    
    6
    
    dd if=/dev/zero of=test.bin bs=1M count=10  # 创建10MB全零文件
    
    7
    
    # 用途: 初始化内存/磁盘区域
    
    8
    
    
    
    
    9
    
    # /dev/urandom - 随机数源
    
    10
    
    dd if=/dev/urandom of=random.bin bs=256 count=1  # 256字节随机数

### Q26: 异步IO(aio)的使用？

> 🧠 **秒懂：** aio_read/aio_write发起异步IO→继续干其他事→aio_return/aio_error检查完成状态。或用io_uring(新一代异步IO，更高效)。适合高性能I/O密集场景。

异步IO提交请求后立即返回，完成后通知：
    
    
    1
    
    #include <aio.h>
    
    2
    
    
    
    
    3
    
    struct aiocb aio;
    
    4
    
    memset(&aio, 0, sizeof(aio));
    
    5
    
    aio.aio_fildes = fd;
    
    6
    
    aio.aio_buf = buffer;
    
    7
    
    aio.aio_nbytes = 4096;
    
    8
    
    aio.aio_offset = 0;
    
    9
    
    
    
    
    10
    
    // 提交异步读
    
    11
    
    aio_read(&aio);
    
    12
    
    
    
    
    13
    
    // 检查是否完成
    
    14
    
    while (aio_error(&aio) == EINPROGRESS) {
    
    15
    
        // 做其他事情
    
    5 collapsed lines
    
    16
    
        do_other_work();
    
    17
    
    }
    
    18
    
    
    
    
    19
    
    // 获取结果
    
    20
    
    ssize_t ret = aio_return(&aio);

### Q27: 目录操作(opendir/readdir)？

> 🧠 **秒懂：** opendir打开目录→readdir逐个读取目录项(返回struct dirent含文件名和类型)→closedir关闭。配合stat获取文件详细信息。遍历目录树用递归。

遍历目录是嵌入式文件管理的常见需求：
    
    
    1
    
    #include <dirent.h>
    
    2
    
    
    
    
    3
    
    void list_files(const char *path) {
    
    4
    
        DIR *dir = opendir(path);
    
    5
    
        if (!dir) { perror("opendir"); return; }
    
    6
    
    
    
    
    7
    
        struct dirent *entry;
    
    8
    
        while ((entry = readdir(dir)) != NULL) {
    
    9
    
            if (entry->d_name[0] == '.') continue;  // 跳过.和..
    
    10
    
    
    
    
    11
    
            if (entry->d_type == DT_DIR)
    
    12
    
                printf("[DIR]  %s\n", entry->d_name);
    
    13
    
            else
    
    14
    
                printf("[FILE] %s\n", entry->d_name);
    
    15
    
        }
    
    2 collapsed lines
    
    16
    
        closedir(dir);
    
    17
    
    }

### Q28: stat系列函数获取文件信息？

> 🧠 **秒懂：** stat(path)/fstat(fd)/lstat(path,不跟软链接)获取文件的大小、权限、修改时间、inode号、文件类型等信息。struct stat中st_mode判断是文件/目录/设备。

stat获取文件元数据(大小、权限、修改时间等)：
    
    
    1
    
    #include <sys/stat.h>
    
    2
    
    
    
    
    3
    
    struct stat st;
    
    4
    
    if (stat("/tmp/test.txt", &st) == 0) {
    
    5
    
        printf("Size: %ld\n", st.st_size);
    
    6
    
        printf("Mode: %o\n", st.st_mode & 0777);
    
    7
    
        printf("UID: %d\n", st.st_uid);
    
    8
    
        printf("Modified: %s", ctime(&st.st_mtime));
    
    9
    
    
    
    
    10
    
        // 判断文件类型
    
    11
    
        if (S_ISREG(st.st_mode)) printf("Regular file\n");
    
    12
    
        if (S_ISDIR(st.st_mode)) printf("Directory\n");
    
    13
    
        if (S_ISLNK(st.st_mode)) printf("Symlink\n");
    
    14
    
    }
    
    15
    
    
    
    
    2 collapsed lines
    
    16
    
    // stat vs lstat: lstat不跟随符号链接
    
    17
    
    // stat vs fstat: fstat用fd而不是路径

### Q29: 文件系统空间查询(statfs)？

> 🧠 **秒懂：** statfs/fstatfs获取文件系统信息：总空间、可用空间、块大小、inode数量。嵌入式中用于监控Flash/SD卡剩余空间，防止日志写满文件系统。

嵌入式设备需要监控存储空间避免写满：
    
    
    1
    
    // 关键系统调用示例(见各函数注释)
    
    2
    
    #include <sys/vfs.h>
    
    3
    
    
    
    
    4
    
    struct statfs sfs;
    
    5
    
    if (statfs("/", &sfs) == 0) {
    
    6
    
        unsigned long total = sfs.f_blocks * sfs.f_bsize;
    
    7
    
        unsigned long free = sfs.f_bfree * sfs.f_bsize;
    
    8
    
        unsigned long avail = sfs.f_bavail * sfs.f_bsize;
    
    9
    
        printf("Total: %lu MB\n", total / 1024 / 1024);
    
    10
    
        printf("Free:  %lu MB\n", free / 1024 / 1024);
    
    11
    
        printf("Avail: %lu MB\n", avail / 1024 / 1024);
    
    12
    
    }

### Q30: tmpfile和mkstemp临时文件？

> 🧠 **秒懂：** tmpfile()创建匿名临时文件(自动删除)。mkstemp()创建有名临时文件(需手动unlink)。临时文件用于中间结果存储，避免程序崩溃后留下垃圾文件。

安全创建临时文件(避免竞态条件)：
    
    
    1
    
    // 方法1: tmpfile(自动删除)
    
    2
    
    FILE *fp = tmpfile();  // 关闭时自动删除
    
    3
    
    fprintf(fp, "temp data");
    
    4
    
    rewind(fp);
    
    5
    
    
    
    
    6
    
    // 方法2: mkstemp(需要手动删除)
    
    7
    
    char template[] = "/tmp/myapp_XXXXXX";
    
    8
    
    int fd = mkstemp(template);  // XXXXXX被替换为唯一字符串
    
    9
    
    write(fd, "data", 4);
    
    10
    
    close(fd);
    
    11
    
    unlink(template);  // 删除临时文件

* * *

## 三、进程管理（Q31~Q50）

### Q31: fork创建子进程的典型用法？

> 🧠 **秒懂：** fork后父子进程通过返回值区分→子进程exec加载新程序或执行任务→父进程wait回收子进程。典型场景：Shell执行命令、守护进程、多进程服务器。

fork在嵌入式Linux守护进程、多进程服务器中广泛使用：
    
    
    1
    
    #include <unistd.h>
    
    2
    
    #include <sys/wait.h>
    
    3
    
    
    
    
    4
    
    int main() {
    
    5
    
        pid_t pid = fork();
    
    6
    
    
    
    
    7
    
        if (pid < 0) {
    
    8
    
            perror("fork");
    
    9
    
            exit(1);
    
    10
    
        } else if (pid == 0) {
    
    11
    
            // 子进程
    
    12
    
            printf("Child PID: %d\n", getpid());
    
    13
    
            execl("/bin/ls", "ls", "-la", NULL);
    
    14
    
            exit(1);  // exec失败才到这
    
    15
    
        } else {
    
    8 collapsed lines
    
    16
    
            // 父进程
    
    17
    
            int status;
    
    18
    
            waitpid(pid, &status, 0);
    
    19
    
            if (WIFEXITED(status))
    
    20
    
                printf("Child exited with %d\n", WEXITSTATUS(status));
    
    21
    
        }
    
    22
    
        return 0;
    
    23
    
    }

### Q32: wait/waitpid的作用和区别？

> 🧠 **秒懂：** wait阻塞等待任意子进程结束，waitpid可以指定等某个子进程且支持非阻塞(WNOHANG)。回收子进程防止变成僵尸进程。WIFSIGNALED等宏检查退出原因。

等待子进程结束并回收资源(避免僵尸进程)：
    
    
    1
    
    // wait: 等待任意子进程
    
    2
    
    int status;
    
    3
    
    pid_t child = wait(&status);
    
    4
    
    
    
    
    5
    
    // waitpid: 等待指定子进程, 支持非阻塞
    
    6
    
    pid_t child = waitpid(pid, &status, WNOHANG);
    
    7
    
    // WNOHANG: 如果子进程没结束立即返回0
    
    8
    
    
    
    
    9
    
    // 解析退出状态
    
    10
    
    if (WIFEXITED(status))      // 正常退出
    
    11
    
        printf("Exit code: %d\n", WEXITSTATUS(status));
    
    12
    
    if (WIFSIGNALED(status))    // 被信号杀死
    
    13
    
        printf("Killed by signal: %d\n", WTERMSIG(status));
    
    14
    
    if (WIFSTOPPED(status))     // 被暂停
    
    15
    
        printf("Stopped by signal: %d\n", WSTOPSIG(status));

### Q33: 如何创建守护进程(daemon)？

> 🧠 **秒懂：** 创建守护进程步骤：fork→父进程退出→setsid创建新会话→再fork→关闭所有fd→重定向stdin/stdout/stderr到/dev/null→chdir到/→写PID文件。

守护进程是后台运行、脱离终端的进程，嵌入式服务程序必备：
    
    
    1
    
    #include <unistd.h>
    
    2
    
    #include <sys/stat.h>
    
    3
    
    
    
    
    4
    
    void daemonize(void) {
    
    5
    
        // 1. fork，父进程退出
    
    6
    
        pid_t pid = fork();
    
    7
    
        if (pid > 0) exit(0);
    
    8
    
        if (pid < 0) exit(1);
    
    9
    
    
    
    
    10
    
        // 2. 创建新会话(脱离终端)
    
    11
    
        setsid();
    
    12
    
    
    
    
    13
    
        // 3. 再次fork(防止重新关联终端)
    
    14
    
        pid = fork();
    
    15
    
        if (pid > 0) exit(0);
    
    17 collapsed lines
    
    16
    
        if (pid < 0) exit(1);
    
    17
    
    
    
    
    18
    
        // 4. 修改工作目录
    
    19
    
        chdir("/");
    
    20
    
    
    
    
    21
    
        // 5. 重设文件权限掩码
    
    22
    
        umask(0);
    
    23
    
    
    
    
    24
    
        // 6. 关闭所有文件描述符
    
    25
    
        for (int i = 0; i < sysconf(_SC_OPEN_MAX); i++)
    
    26
    
            close(i);
    
    27
    
    
    
    
    28
    
        // 7. 重定向stdin/stdout/stderr到/dev/null
    
    29
    
        open("/dev/null", O_RDWR);  // stdin  -> fd 0
    
    30
    
        dup(0);                     // stdout -> fd 1
    
    31
    
        dup(0);                     // stderr -> fd 2
    
    32
    
    }

### Q34: 进程组和会话的概念？

> 🧠 **秒懂：** 进程组是一组相关进程(如管道命令组)，会话是一组进程组(对应一个终端)。Ctrl+C发信号给前台进程组。守护进程通过setsid脱离终端会话。

理解进程组和会话对于信号管理和终端控制很重要：
    
    
    1
    
    终端 tty ─── 会话(Session)
    
    2
    
                  │
    
    3
    
                  ├── 前台进程组(接收键盘输入和信号)
    
    4
    
                  │   ├── shell
    
    5
    
                  │   └── shell启动的前台命令
    
    6
    
                  │
    
    7
    
                  └── 后台进程组(&启动的)
    
    8
    
                      ├── bg_proc1
    
    9
    
                      └── bg_proc2
    
    10
    
    
    
    
    11
    
    API:
    
    12
    
      getpgrp()    - 获取进程组ID
    
    13
    
      setpgid()    - 设置进程组
    
    14
    
      getsid()     - 获取会话ID
    
    15
    
      setsid()     - 创建新会话(daemon关键步骤)
    
    1 collapsed line
    
    16
    
      tcsetpgrp()  - 设置前台进程组

### Q35: exec族函数(execl/execv/execve)？

> 🧠 **秒懂：** exec族函数用新程序替换当前进程映像(PID不变)。l(列表参数)/v(数组参数)、p(搜索PATH)、e(指定环境变量)的组合。fork+exec是创建新进程的标准模式。

exec用新程序替换当前进程映像：
    
    
    1
    
    // execl - 参数列表
    
    2
    
    execl("/bin/echo", "echo", "hello", "world", NULL);
    
    3
    
    
    
    
    4
    
    // execv - 参数数组
    
    5
    
    char *args[] = {"echo", "hello", "world", NULL};
    
    6
    
    execv("/bin/echo", args);
    
    7
    
    
    
    
    8
    
    // execvp - 自动搜索PATH
    
    9
    
    execlp("echo", "echo", "hello", NULL);
    
    10
    
    
    
    
    11
    
    // execve - 指定环境变量
    
    12
    
    char *envp[] = {"PATH=/bin", "HOME=/tmp", NULL};
    
    13
    
    execve("/bin/echo", args, envp);

**exec后PID不变，但以下继承：**

  * 文件描述符(除非设置FD_CLOEXEC)
  * 进程ID、父进程ID
  * 信号掩码



### Q36: system()和popen()的使用？

> 🧠 **秒懂：** system()执行Shell命令(创建子进程+Shell解析+等待完成)。popen()执行命令并通过管道读写其输入输出。popen更灵活，system更简单。注意：两者都有Shell注入风险。

执行shell命令的两种便捷方式：
    
    
    1
    
    // system() - 执行命令等待结束
    
    2
    
    int ret = system("ls -la /tmp");
    
    3
    
    // ret = 子进程的exit status
    
    4
    
    
    
    
    5
    
    // popen() - 执行命令并读取输出
    
    6
    
    FILE *fp = popen("ifconfig eth0", "r");
    
    7
    
    char buf[1024];
    
    8
    
    while (fgets(buf, sizeof(buf), fp)) {
    
    9
    
        printf("%s", buf);
    
    10
    
    }
    
    11
    
    pclose(fp);
    
    12
    
    
    
    
    13
    
    // 注意: system/popen有安全风险(命令注入)
    
    14
    
    // 嵌入式产品中应避免拼接用户输入到命令

### Q37: 进程间通信之管道(pipe)？

> 🧠 **秒懂：** pipe()创建匿名管道→fork→父进程关读端写数据→子进程关写端读数据。管道是半双工的——要双向通信需要创建两个管道。最基本的IPC。

管道用于父子进程/兄弟进程间单向数据传输：
    
    
    1
    
    int pipefd[2];
    
    2
    
    pipe(pipefd);  // pipefd[0]读, pipefd[1]写
    
    3
    
    
    
    
    4
    
    pid_t pid = fork();
    
    5
    
    if (pid == 0) {
    
    6
    
        // 子进程：写数据
    
    7
    
        close(pipefd[0]);
    
    8
    
        const char *msg = "Hello from child";
    
    9
    
        write(pipefd[1], msg, strlen(msg));
    
    10
    
        close(pipefd[1]);
    
    11
    
        exit(0);
    
    12
    
    } else {
    
    13
    
        // 父进程：读数据
    
    14
    
        close(pipefd[1]);
    
    15
    
        char buf[256];
    
    6 collapsed lines
    
    16
    
        int n = read(pipefd[0], buf, sizeof(buf) - 1);
    
    17
    
        buf[n] = '\0';
    
    18
    
        printf("Parent got: %s\n", buf);
    
    19
    
        close(pipefd[0]);
    
    20
    
        wait(NULL);
    
    21
    
    }

### Q38: 命名管道(FIFO)的使用？

> 🧠 **秒懂：** FIFO是有名字的管道(在文件系统中可见)——无亲缘关系的进程也能通信。mkfifo创建→一个进程open写→另一个open读。常用于简单的进程间数据传递。

FIFO允许无亲缘关系的进程通信：
    
    
    1
    
    #include <sys/stat.h>
    
    2
    
    
    
    
    3
    
    // 创建FIFO
    
    4
    
    mkfifo("/tmp/myfifo", 0666);
    
    5
    
    
    
    
    6
    
    // 写者进程
    
    7
    
    int fd = open("/tmp/myfifo", O_WRONLY);
    
    8
    
    write(fd, "data", 4);
    
    9
    
    close(fd);
    
    10
    
    
    
    
    11
    
    // 读者进程(另一个程序)
    
    12
    
    int fd = open("/tmp/myfifo", O_RDONLY);
    
    13
    
    char buf[256];
    
    14
    
    int n = read(fd, buf, sizeof(buf));
    
    15
    
    close(fd);
    
    1 collapsed line
    
    16
    
    unlink("/tmp/myfifo");  // 用完删除

### Q39: 共享内存(POSIX接口)？

> 🧠 **秒懂：** shm_open创建共享内存对象→ftruncate设置大小→mmap映射到进程→读写→munmap→shm_unlink。是最快的IPC方式——直接操作同一块物理内存。需要配合同步机制。

POSIX共享内存是进程间高速通信的方式：
    
    
    1
    
    #include <sys/mman.h>
    
    2
    
    #include <fcntl.h>
    
    3
    
    
    
    
    4
    
    // 创建共享内存对象
    
    5
    
    int shm_fd = shm_open("/my_shm", O_CREAT | O_RDWR, 0666);
    
    6
    
    ftruncate(shm_fd, 4096);
    
    7
    
    
    
    
    8
    
    // 映射到进程空间
    
    9
    
    char *addr = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
    
    10
    
                      MAP_SHARED, shm_fd, 0);
    
    11
    
    
    
    
    12
    
    // 写入数据
    
    13
    
    sprintf(addr, "Hello shared memory");
    
    14
    
    
    
    
    15
    
    // 另一个进程读取
    
    7 collapsed lines
    
    16
    
    int shm_fd2 = shm_open("/my_shm", O_RDONLY, 0);
    
    17
    
    char *addr2 = mmap(NULL, 4096, PROT_READ, MAP_SHARED, shm_fd2, 0);
    
    18
    
    printf("Got: %s\n", addr2);
    
    19
    
    
    
    
    20
    
    // 清理
    
    21
    
    munmap(addr, 4096);
    
    22
    
    shm_unlink("/my_shm");

### Q40: 消息队列(POSIX接口)？

> 🧠 **秒懂：** mq_open创建消息队列→mq_send发消息→mq_receive收消息→mq_close→mq_unlink。消息队列自带同步(空时收阻塞、满时发阻塞)，比管道支持消息优先级。

消息队列支持带优先级的消息传递：
    
    
    1
    
    #include <mqueue.h>
    
    2
    
    
    
    
    3
    
    // 创建消息队列
    
    4
    
    struct mq_attr attr = { .mq_maxmsg = 10, .mq_msgsize = 256 };
    
    5
    
    mqd_t mq = mq_open("/my_mq", O_CREAT | O_RDWR, 0666, &attr);
    
    6
    
    
    
    
    7
    
    // 发送消息(优先级=1)
    
    8
    
    mq_send(mq, "Hello", 5, 1);
    
    9
    
    
    
    
    10
    
    // 接收消息
    
    11
    
    char buf[256];
    
    12
    
    unsigned int prio;
    
    13
    
    ssize_t n = mq_receive(mq, buf, sizeof(buf), &prio);
    
    14
    
    printf("Received: %.*s (prio=%u)\n", (int)n, buf, prio);
    
    15
    
    
    
    
    3 collapsed lines
    
    16
    
    // 清理
    
    17
    
    mq_close(mq);
    
    18
    
    mq_unlink("/my_mq");

### Q41: 信号(signal)的处理方法？

> 🧠 **秒懂：** signal()/sigaction()注册信号处理函数。sigaction更强大(可获取信号信息、控制行为)。信号处理函数中只能调用异步信号安全函数(不能用printf/malloc)。

信号处理在嵌入式Linux中用于进程控制和异常处理：
    
    
    1
    
    #include <signal.h>
    
    2
    
    
    
    
    3
    
    volatile sig_atomic_t running = 1;  // volatile: 防止编译器优化
    
    4
    
    
    
    
    5
    
    void sighandler(int sig) {
    
    6
    
        if (sig == SIGINT || sig == SIGTERM)
    
    7
    
            running = 0;
    
    8
    
    }
    
    9
    
    
    
    
    10
    
    int main() {
    
    11
    
        // 推荐使用sigaction(比signal更可靠)
    
    12
    
        struct sigaction sa;
    
    13
    
        sa.sa_handler = sighandler;
    
    14
    
        sigemptyset(&sa.sa_mask);
    
    15
    
        sa.sa_flags = 0;
    
    13 collapsed lines
    
    16
    
        sigaction(SIGINT, &sa, NULL);  // 注册信号处理
    
    17
    
        sigaction(SIGTERM, &sa, NULL);  // 注册信号处理
    
    18
    
    
    
    
    19
    
        // 忽略SIGPIPE(网络编程必须)
    
    20
    
        signal(SIGPIPE, SIG_IGN);  // 注册信号处理
    
    21
    
    
    
    
    22
    
        while (running) {
    
    23
    
            do_work();
    
    24
    
            usleep(100000);
    
    25
    
        }
    
    26
    
        printf("Graceful shutdown\n");
    
    27
    
        return 0;
    
    28
    
    }

### Q42: 信号量(POSIX有名/无名信号量)？

> 🧠 **秒懂：** 有名信号量(sem_open，跨进程)和无名信号量(sem_init，线程间或共享内存)。sem_wait减1(为0阻塞)→sem_post加1(唤醒等待者)。用于控制资源访问和同步。

信号量用于进程/线程间的同步和互斥：
    
    
    1
    
    #include <semaphore.h>
    
    2
    
    
    
    
    3
    
    // 无名信号量(线程间)
    
    4
    
    sem_t sem;
    
    5
    
    sem_init(&sem, 0, 1);  // 0=线程间, 初始值1(互斥)
    
    6
    
    sem_wait(&sem);  // P操作
    
    7
    
    // 临界区
    
    8
    
    sem_post(&sem);  // V操作
    
    9
    
    sem_destroy(&sem);
    
    10
    
    
    
    
    11
    
    // 有名信号量(进程间)
    
    12
    
    sem_t *sem = sem_open("/my_sem", O_CREAT, 0666, 1);
    
    13
    
    sem_wait(sem);
    
    14
    
    // 临界区
    
    15
    
    sem_post(sem);
    
    2 collapsed lines
    
    16
    
    sem_close(sem);
    
    17
    
    sem_unlink("/my_sem");

### Q43: 多进程并发服务器模型？

> 🧠 **秒懂：** 主进程listen→accept后fork子进程处理连接→父进程继续accept→子进程处理完exit。简单直观但每连接一个进程开销大。改进：预fork进程池或改用多线程/epoll。

嵌入式网络设备的简易多进程服务器：
    
    
    1
    
    // 预fork模式(避免每次连接都fork)
    
    2
    
    #define WORKER_NUM 4
    
    3
    
    
    
    
    4
    
    int listen_fd = socket_bindlisten(8080);
    
    5
    
    
    
    
    6
    
    for (int i = 0; i < WORKER_NUM; i++) {
    
    7
    
        if (fork() == 0) {
    
    8
    
            // 子进程循环accept
    
    9
    
            while (1) {
    
    10
    
                int client_fd = accept(listen_fd, NULL, NULL);
    
    11
    
                handle_request(client_fd);
    
    12
    
                close(client_fd);
    
    13
    
            }
    
    14
    
            exit(0);
    
    15
    
        }
    
    3 collapsed lines
    
    16
    
    }
    
    17
    
    // 父进程等待子进程
    
    18
    
    while (wait(NULL) > 0);

### Q44: 进程资源限制(setrlimit)？

> 🧠 **秒懂：** setrlimit设置进程资源限制：最大文件数(RLIMIT_NOFILE)、最大栈大小(RLIMIT_STACK)、最大CPU时间。嵌入式中用于限制进程资源使用防止资源耗尽。

限制进程资源使用，防止单个进程耗尽系统资源：
    
    
    1
    
    #include <sys/resource.h>
    
    2
    
    
    
    
    3
    
    // 限制最大文件描述符数
    
    4
    
    struct rlimit rl;
    
    5
    
    rl.rlim_cur = 1024;   // 软限制
    
    6
    
    rl.rlim_max = 4096;   // 硬限制
    
    7
    
    setrlimit(RLIMIT_NOFILE, &rl);
    
    8
    
    
    
    
    9
    
    // 限制进程最大虚拟内存(防OOM)
    
    10
    
    rl.rlim_cur = 100 * 1024 * 1024;  // 100MB
    
    11
    
    rl.rlim_max = 200 * 1024 * 1024;
    
    12
    
    setrlimit(RLIMIT_AS, &rl);
    
    13
    
    
    
    
    14
    
    // 限制core dump大小
    
    15
    
    rl.rlim_cur = RLIM_INFINITY;
    
    1 collapsed line
    
    16
    
    setrlimit(RLIMIT_CORE, &rl);  // 允许生成core文件

### Q45: 进程优先级设置(nice/setpriority)？

> 🧠 **秒懂：** nice值(-20到19)调整进程优先级：值越低优先级越高。实时进程用sched_setscheduler设置SCHED_FIFO/RR。嵌入式中关键任务设高优先级保证实时性。

调整进程优先级影响CPU调度：
    
    
    1
    
    #include <sys/resource.h>
    
    2
    
    #include <unistd.h>
    
    3
    
    
    
    
    4
    
    // nice值范围: -20(最高) ~ 19(最低), 默认0
    
    5
    
    nice(5);  // 降低当前进程优先级(nice值+5)
    
    6
    
    
    
    
    7
    
    // setpriority(更灵活)
    
    8
    
    setpriority(PRIO_PROCESS, 0, -10);  // 0=当前进程, nice=-10
    
    9
    
    int prio = getpriority(PRIO_PROCESS, 0);
    
    10
    
    
    
    
    11
    
    // 实时优先级(需root)
    
    12
    
    struct sched_param param;
    
    13
    
    param.sched_priority = 50;
    
    14
    
    sched_setscheduler(0, SCHED_FIFO, &param);

### Q46: 什么是僵尸进程？如何避免？

> 🧠 **秒懂：** 僵尸进程：子进程退出但父进程没有wait回收，进程表项残留。避免方法：①wait/waitpid②SIGCHLD信号处理中调用waitpid③signal(SIGCHLD, SIG_IGN)。必须回收不然进程表满。

僵尸进程是已退出但未被父进程回收(wait)的子进程：
    
    
    1
    
    // 方法1: 父进程调用wait/waitpid
    
    2
    
    while (waitpid(-1, NULL, WNOHANG) > 0);
    
    3
    
    
    
    
    4
    
    // 方法2: 忽略SIGCHLD(最简单)
    
    5
    
    signal(SIGCHLD, SIG_IGN);
    
    6
    
    
    
    
    7
    
    // 方法3: double fork
    
    8
    
    if (fork() == 0) {
    
    9
    
        if (fork() == 0) {
    
    10
    
            // 孙子进程(被init收养，不会变僵尸)
    
    11
    
            do_work();
    
    12
    
            exit(0);
    
    13
    
        }
    
    14
    
        exit(0);  // 子进程立即退出
    
    15
    
    }
    
    1 collapsed line
    
    16
    
    wait(NULL);  // 回收子进程(瞬间)

### Q47: 进程间通过Unix Domain Socket通信？

> 🧠 **秒懂：** Unix Domain Socket在本机进程间通信：和TCP socket类似的API(socket/bind/listen/accept)但走内核不走网络协议栈，效率比TCP/IP高。还能传递文件描述符。

Unix域套接字是本地进程通信的高效方式：
    
    
    1
    
    // 服务端
    
    2
    
    int sfd = socket(AF_UNIX, SOCK_STREAM, 0);
    
    3
    
    struct sockaddr_un addr;
    
    4
    
    addr.sun_family = AF_UNIX;
    
    5
    
    strncpy(addr.sun_path, "/tmp/my.sock", sizeof(addr.sun_path)-1);
    
    6
    
    unlink(addr.sun_path);
    
    7
    
    bind(sfd, (struct sockaddr *)&addr, sizeof(addr));
    
    8
    
    listen(sfd, 5);
    
    9
    
    int cfd = accept(sfd, NULL, NULL);
    
    10
    
    
    
    
    11
    
    // 客户端
    
    12
    
    int cfd = socket(AF_UNIX, SOCK_STREAM, 0);
    
    13
    
    connect(cfd, (struct sockaddr *)&addr, sizeof(addr));
    
    14
    
    write(cfd, "hello", 5);

**优势：** 比TCP快(无网络协议栈开销)，支持传递文件描述符(SCM_RIGHTS)。

### Q48: 多进程调试技巧？

> 🧠 **秒懂：** GDB中set follow-fork-mode child跟踪子进程。或用detach-on-fork off同时附加父子。多进程调试用gdbserver分别attach不同进程。strace -f跟踪fork后的子进程。

嵌入式多进程程序调试方法：

Terminal window
    
    
    1
    
    # GDB: follow-fork-mode
    
    2
    
    (gdb) set follow-fork-mode child    # fork后跟踪子进程
    
    3
    
    (gdb) set detach-on-fork off        # fork后不分离任何进程
    
    4
    
    (gdb) info inferiors                # 查看所有被调试进程
    
    5
    
    (gdb) inferior 2                    # 切换到进程2
    
    6
    
    
    
    
    7
    
    # strace跟踪子进程
    
    8
    
    strace -f ./multi_proc_app          # -f跟踪fork的子进程
    
    9
    
    
    
    
    10
    
    # 日志法(嵌入式最常用)
    
    11
    
    #define LOG(fmt, ...) fprintf(stderr, "[%d][%s:%d] " fmt "\n", \
    
    12
    
            getpid(), __func__, __LINE__, ##__VA_ARGS__)

### Q49: 环境变量的操作？

> 🧠 **秒懂：** getenv获取、setenv设置、unsetenv删除、putenv设置。子进程继承父进程的环境变量。嵌入式中CROSS_COMPILE、PATH等环境变量影响编译和运行。

环境变量在嵌入式启动脚本和配置中广泛使用：
    
    
    1
    
    #include <stdlib.h>
    
    2
    
    
    
    
    3
    
    // 获取
    
    4
    
    char *home = getenv("HOME");
    
    5
    
    
    
    
    6
    
    // 设置(覆盖已有)
    
    7
    
    setenv("MY_VAR", "value", 1);
    
    8
    
    
    
    
    9
    
    // 设置(不覆盖)
    
    10
    
    setenv("MY_VAR", "value", 0);
    
    11
    
    
    
    
    12
    
    // 删除
    
    13
    
    unsetenv("MY_VAR");
    
    14
    
    
    
    
    15
    
    // putenv(直接使用传入的字符串，不复制)
    
    6 collapsed lines
    
    16
    
    putenv("KEY=value");
    
    17
    
    
    
    
    18
    
    // 遍历所有环境变量
    
    19
    
    extern char **environ;
    
    20
    
    for (char **ep = environ; *ep; ep++)
    
    21
    
        printf("%s\n", *ep);

### Q50: Linux进程内存查看方法？

> 🧠 **秒懂：** 方法：①/proc/PID/status(VmRSS实际内存) ②/proc/PID/maps(详细映射) ③top/htop(实时监控) ④pmap(进程内存映射) ⑤valgrind(详细分析)。RSS是进程实际占用的物理内存。

分析进程内存使用是嵌入式性能优化的基础：

Terminal window
    
    
    1
    
    # 方法1: /proc/<pid>/status
    
    2
    
    grep -E "VmRSS|VmSize|Threads" /proc/<pid>/status
    
    3
    
    # VmSize: 虚拟内存总量
    
    4
    
    # VmRSS:  物理内存(实际占用)
    
    5
    
    
    
    
    6
    
    # 方法2: /proc/<pid>/maps (内存映射详情)
    
    7
    
    cat /proc/<pid>/maps
    
    8
    
    # 地址范围  权限 偏移 设备 inode 路径
    
    9
    
    # 00400000-00401000 r-xp ... /usr/bin/myapp (代码段)
    
    10
    
    
    
    
    11
    
    # 方法3: /proc/<pid>/smaps (详细内存统计)
    
    12
    
    cat /proc/<pid>/smaps | grep -E "^Size|Rss|Pss"
    
    13
    
    
    
    
    14
    
    # 方法4: top/htop
    
    15
    
    top -p <pid>  # 监控特定进程

* * *

## 四、线程编程（Q51~Q70）

### Q51: pthread线程创建和基本使用？

> 🧠 **秒懂：** pthread_create创建线程(传入函数和参数)→线程执行→pthread_join等待结束(或pthread_detach分离)。线程共享进程的地址空间——全局变量共享但要注意同步。

POSIX线程是Linux多线程编程的标准接口：
    
    
    1
    
    #include <pthread.h>
    
    2
    
    
    
    
    3
    
    void *thread_func(void *arg) {
    
    4
    
        int id = *(int *)arg;
    
    5
    
        printf("Thread %d running\n", id);
    
    6
    
        return (void *)(long)id;
    
    7
    
    }
    
    8
    
    
    
    
    9
    
    int main() {
    
    10
    
        pthread_t tid;
    
    11
    
        int arg = 42;
    
    12
    
    
    
    
    13
    
        // 创建线程
    
    14
    
        pthread_create(&tid, NULL, thread_func, &arg);
    
    15
    
    
    
    
    8 collapsed lines
    
    16
    
        // 等待线程结束
    
    17
    
        void *retval;
    
    18
    
        pthread_join(tid, &retval);
    
    19
    
        printf("Thread returned: %ld\n", (long)retval);
    
    20
    
    
    
    
    21
    
        return 0;
    
    22
    
    }
    
    23
    
    // 编译: gcc -pthread program.c

### Q52: 线程属性设置(pthread_attr)？

> 🧠 **秒懂：** pthread_attr_setdetachstate(分离/可连接)、pthread_attr_setstacksize(栈大小)、pthread_attr_setschedpolicy(调度策略)。嵌入式中常调小线程栈大小节省内存。

设置线程栈大小、分离状态等属性：
    
    
    1
    
    pthread_attr_t attr;
    
    2
    
    pthread_attr_init(&attr);
    
    3
    
    
    
    
    4
    
    // 设置分离状态(分离后不能join)
    
    5
    
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    
    6
    
    
    
    
    7
    
    // 设置栈大小(嵌入式需要控制内存)
    
    8
    
    pthread_attr_setstacksize(&attr, 64 * 1024);  // 64KB
    
    9
    
    
    
    
    10
    
    // 设置调度策略和优先级
    
    11
    
    pthread_attr_setschedpolicy(&attr, SCHED_FIFO);
    
    12
    
    struct sched_param param = { .sched_priority = 50 };
    
    13
    
    pthread_attr_setschedparam(&attr, &param);
    
    14
    
    
    
    
    15
    
    pthread_t tid;
    
    2 collapsed lines
    
    16
    
    pthread_create(&tid, &attr, thread_func, NULL);
    
    17
    
    pthread_attr_destroy(&attr);

### Q53: 互斥锁(pthread_mutex)的使用？

> 🧠 **秒懂：** pthread_mutex_lock加锁→操作共享资源→pthread_mutex_unlock解锁。加锁失败则阻塞等待。必须确保所有路径都能解锁(包括错误路径)。是最常用的线程同步机制。

互斥锁是线程同步最基本的方式：
    
    
    1
    
    pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
    
    2
    
    
    
    
    3
    
    // 或动态初始化(可设置属性)
    
    4
    
    pthread_mutexattr_t mattr;
    
    5
    
    pthread_mutexattr_init(&mattr);
    
    6
    
    pthread_mutexattr_settype(&mattr, PTHREAD_MUTEX_ERRORCHECK); // 错误检查型
    
    7
    
    pthread_mutex_init(&mutex, &mattr);
    
    8
    
    
    
    
    9
    
    // 加锁/解锁
    
    10
    
    pthread_mutex_lock(&mutex);
    
    11
    
    // 临界区...
    
    12
    
    pthread_mutex_unlock(&mutex);
    
    13
    
    
    
    
    14
    
    // trylock(非阻塞)
    
    15
    
    if (pthread_mutex_trylock(&mutex) == 0) {
    
    7 collapsed lines
    
    16
    
        // 获取成功
    
    17
    
        pthread_mutex_unlock(&mutex);
    
    18
    
    } else {
    
    19
    
        // 锁已被占用
    
    20
    
    }
    
    21
    
    
    
    
    22
    
    pthread_mutex_destroy(&mutex);

### Q54: 条件变量(pthread_cond)的使用？

> 🧠 **秒懂：** 条件变量配合互斥锁实现’等待-通知’：mutex保护条件→pthread_cond_wait(释放锁+睡眠+被唤醒后重新加锁)→pthread_cond_signal唤醒。经典的生产者-消费者模型。

条件变量用于线程间的等待/通知机制：
    
    
    1
    
    pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
    
    2
    
    pthread_cond_t cond = PTHREAD_COND_INITIALIZER;
    
    3
    
    int data_ready = 0;
    
    4
    
    
    
    
    5
    
    // 等待方(消费者)
    
    6
    
    pthread_mutex_lock(&mutex);
    
    7
    
    while (!data_ready)  // 必须用while(防止虚假唤醒)
    
    8
    
        pthread_cond_wait(&cond, &mutex);  // 原子释放锁+等待
    
    9
    
    // 处理数据
    
    10
    
    data_ready = 0;
    
    11
    
    pthread_mutex_unlock(&mutex);
    
    12
    
    
    
    
    13
    
    // 通知方(生产者)
    
    14
    
    pthread_mutex_lock(&mutex);
    
    15
    
    data_ready = 1;
    
    3 collapsed lines
    
    16
    
    pthread_cond_signal(&cond);   // 唤醒一个等待者
    
    17
    
    // pthread_cond_broadcast(&cond); // 唤醒所有等待者
    
    18
    
    pthread_mutex_unlock(&mutex);

### Q55: 读写锁(pthread_rwlock)？

> 🧠 **秒懂：** 读写锁允许多个线程同时读(读锁兼容)，但写锁独占。适合读多写少的场景(如配置数据、缓存)。比互斥锁并发度高——多个读者不互相阻塞。

读写锁适合读多写少的场景(如配置数据)：
    
    
    1
    
    pthread_rwlock_t rwlock = PTHREAD_RWLOCK_INITIALIZER;
    
    2
    
    
    
    
    3
    
    // 读者(可并发)
    
    4
    
    pthread_rwlock_rdlock(&rwlock);
    
    5
    
    read_shared_data();
    
    6
    
    pthread_rwlock_unlock(&rwlock);
    
    7
    
    
    
    
    8
    
    // 写者(独占)
    
    9
    
    pthread_rwlock_wrlock(&rwlock);
    
    10
    
    modify_shared_data();
    
    11
    
    pthread_rwlock_unlock(&rwlock);

### Q56: 线程安全和可重入的区别？

> 🧠 **秒懂：** 线程安全：多线程调用不出错(可以用锁实现)。可重入：同一函数被多次调用(包括中断重入)不出错(不能用锁、不能用全局变量)。可重入是线程安全的子集。

面试常考区分线程安全与可重入的概念：

概念| 含义| 实现方式  
---|---|---  
线程安全| 多线程同时调用结果正确| 加锁/TLS/原子操作  
可重入| 被中断后再次进入仍正确| 不用全局/static变量、不用锁  
      
    
    1
    
    // 不可重入+非线程安全
    
    2
    
    char *buf;  // 全局
    
    3
    
    char *strtok(char *str, const char *delim);  // 经典反面
    
    4
    
    
    
    
    5
    
    // 线程安全但不可重入(用了锁)
    
    6
    
    pthread_mutex_t lock;
    
    7
    
    int safe_counter(void) {
    
    8
    
        pthread_mutex_lock(&lock);
    
    9
    
        static int count = 0;
    
    10
    
        count++;
    
    11
    
        pthread_mutex_unlock(&lock);
    
    12
    
        return count;
    
    13
    
    }
    
    14
    
    
    
    
    15
    
    // 可重入(完全不用共享状态)
    
    1 collapsed line
    
    16
    
    int add(int a, int b) { return a + b; }

### Q57: 线程局部存储(TLS/pthread_key)？

> 🧠 **秒懂：** TLS让每个线程有自己的变量副本——即使变量名相同，各线程访问的是不同的存储。pthread_key_create/pthread_setspecific/getspecific或__thread关键字。用于替代全局变量。

线程私有数据避免加锁和共享冲突：
    
    
    1
    
    // 方法1: __thread修饰符(GCC扩展)
    
    2
    
    __thread int tls_var = 0;  // 每个线程有独立副本
    
    3
    
    
    
    
    4
    
    // 方法2: pthread_key
    
    5
    
    pthread_key_t key;
    
    6
    
    pthread_key_create(&key, free);  // free=析构函数
    
    7
    
    
    
    
    8
    
    // 每个线程设置自己的数据
    
    9
    
    char *data = malloc(64);
    
    10
    
    snprintf(data, 64, "Thread %d data", id);
    
    11
    
    pthread_setspecific(key, data);
    
    12
    
    
    
    
    13
    
    // 获取当前线程的数据
    
    14
    
    char *my_data = pthread_getspecific(key);

### Q58: 线程池的设计和实现？

> 🧠 **秒懂：** 线程池预创建一组线程，任务提交到队列→空闲线程取任务执行→执行完放回池中。避免频繁创建/销毁线程的开销。实现：任务队列+条件变量+工作线程。

线程池避免频繁创建销毁线程的开销：
    
    
    1
    
    #define POOL_SIZE 4
    
    2
    
    #define QUEUE_SIZE 64
    
    3
    
    
    
    
    4
    
    typedef struct {  // 结构体定义
    
    5
    
        void (*func)(void *arg);
    
    6
    
        void *arg;
    
    7
    
    } Task;
    
    8
    
    
    
    
    9
    
    typedef struct {  // 结构体定义
    
    10
    
        pthread_t threads[POOL_SIZE];
    
    11
    
        Task queue[QUEUE_SIZE];
    
    12
    
        int head, tail, count;
    
    13
    
        pthread_mutex_t lock;
    
    14
    
        pthread_cond_t not_empty;
    
    15
    
        pthread_cond_t not_full;
    
    22 collapsed lines
    
    16
    
        int shutdown;
    
    17
    
    } ThreadPool;
    
    18
    
    
    
    
    19
    
    void *worker(void *arg) {
    
    20
    
        ThreadPool *pool = arg;
    
    21
    
        while (1) {
    
    22
    
            pthread_mutex_lock(&pool->lock);  // 加锁(互斥)
    
    23
    
            while (pool->count == 0 && !pool->shutdown)
    
    24
    
                pthread_cond_wait(&pool->not_empty, &pool->lock);
    
    25
    
            if (pool->shutdown) {
    
    26
    
                pthread_mutex_unlock(&pool->lock);  // 解锁
    
    27
    
                return NULL;
    
    28
    
            }
    
    29
    
            Task task = pool->queue[pool->head];
    
    30
    
            pool->head = (pool->head + 1) % QUEUE_SIZE;
    
    31
    
            pool->count--;
    
    32
    
            pthread_cond_signal(&pool->not_full);  // 注册信号处理
    
    33
    
            pthread_mutex_unlock(&pool->lock);  // 解锁
    
    34
    
    
    
    
    35
    
            task.func(task.arg);  // 执行任务
    
    36
    
        }
    
    37
    
    }

### Q59: 线程取消(pthread_cancel)？

> 🧠 **秒懂：** pthread_cancel请求取消线程(不是立即杀死)。线程在取消点(如sleep/read/write等系统调用)才会响应取消。可以用pthread_setcancelstate禁用取消。慎用——可能导致资源泄漏。

取消正在执行的线程(需谨慎使用)：
    
    
    1
    
    pthread_t tid;
    
    2
    
    pthread_create(&tid, NULL, worker, NULL);
    
    3
    
    
    
    
    4
    
    // 请求取消
    
    5
    
    pthread_cancel(tid);
    
    6
    
    
    
    
    7
    
    // 线程中设置取消属性
    
    8
    
    pthread_setcancelstate(PTHREAD_CANCEL_ENABLE, NULL);   // 允许取消
    
    9
    
    pthread_setcanceltype(PTHREAD_CANCEL_DEFERRED, NULL);  // 延迟取消(在取消点)
    
    10
    
    
    
    
    11
    
    // 清理函数(类似析构)
    
    12
    
    void cleanup(void *arg) {
    
    13
    
        free(arg);
    
    14
    
        pthread_mutex_unlock(&some_mutex);
    
    15
    
    }
    
    3 collapsed lines
    
    16
    
    pthread_cleanup_push(cleanup, resource);
    
    17
    
    // ... 工作代码 ...
    
    18
    
    pthread_cleanup_pop(1);  // 1=执行清理, 0=不执行

### Q60: 线程屏障(pthread_barrier)？

> 🧠 **秒懂：** 屏障让一组线程都到达同一点后才继续执行。pthread_barrier_init(设置计数)→各线程调用pthread_barrier_wait→最后一个到达的触发所有线程继续。适合并行计算的阶段同步。

屏障让多个线程在某一点集合同步：
    
    
    1
    
    pthread_barrier_t barrier;
    
    2
    
    pthread_barrier_init(&barrier, NULL, 4);  // 4个线程
    
    3
    
    
    
    
    4
    
    void *thread_func(void *arg) {
    
    5
    
        // 阶段1: 各自初始化
    
    6
    
        init_work();
    
    7
    
    
    
    
    8
    
        // 屏障等待: 4个线程都到这才继续
    
    9
    
        pthread_barrier_wait(&barrier);
    
    10
    
    
    
    
    11
    
        // 阶段2: 所有线程初始化完毕后开始协作
    
    12
    
        cooperative_work();
    
    13
    
        return NULL;
    
    14
    
    }

### Q61: 自旋锁(pthread_spinlock)？

> 🧠 **秒懂：** 自旋锁在获取失败时循环忙等(不让出CPU)。适合临界区极短(微秒级)且不会睡眠的场景。多核系统避免上下文切换开销——但单核上自旋浪费CPU，不如用互斥锁。

自旋锁在用户态的实现(适合极短临界区)：
    
    
    1
    
    pthread_spinlock_t spinlock;
    
    2
    
    pthread_spin_init(&spinlock, PTHREAD_PROCESS_PRIVATE);
    
    3
    
    
    
    
    4
    
    pthread_spin_lock(&spinlock);
    
    5
    
    // 极短临界区(几十ns以内)
    
    6
    
    counter++;
    
    7
    
    pthread_spin_unlock(&spinlock);
    
    8
    
    
    
    
    9
    
    pthread_spin_destroy(&spinlock);

### Q62: 原子操作(GCC内建)？

> 🧠 **秒懂：** __sync_fetch_and_add等GCC内建原子操作，或C11的<stdatomic.h>。编译器保证操作的原子性。用于无锁计数器、标志位等简单场景，比锁开销小得多。

GCC内置原子操作用于无锁编程：
    
    
    1
    
    // C11标准原子类型
    
    2
    
    #include <stdatomic.h>
    
    3
    
    atomic_int counter = 0;
    
    4
    
    atomic_fetch_add(&counter, 1);
    
    5
    
    atomic_store(&counter, 0);
    
    6
    
    int val = atomic_load(&counter);
    
    7
    
    
    
    
    8
    
    // GCC内建(兼容旧版本)
    
    9
    
    int val = __sync_fetch_and_add(&counter, 1);
    
    10
    
    __sync_lock_test_and_set(&lock, 1);  // 设置并返回旧值
    
    11
    
    __sync_lock_release(&lock);           // 释放
    
    12
    
    bool ok = __sync_bool_compare_and_swap(&val, expected, desired);

### Q63: 死锁分析与避免实践？

> 🧠 **秒懂：** 死锁分析：①画出锁的获取依赖图找环 ②用GDB的info threads查看线程状态和持有锁 ③TSAN(ThreadSanitizer)编译检测。预防：固定加锁顺序、使用trylock、减少锁粒度。

多线程开发中死锁定位和避免：

Terminal window
    
    
    1
    
    # 检测死锁: GDB
    
    2
    
    (gdb) thread apply all bt   # 查看所有线程调用栈
    
    3
    
    # 死锁特征: 多个线程都阻塞在pthread_mutex_lock
    
    4
    
    
    
    
    5
    
    # 检测工具: Valgrind Helgrind
    
    6
    
    valgrind --tool=helgrind ./multi_thread_app
    
    
    1
    
    // 避免规则
    
    2
    
    // 1. 锁序一致(全局规定加锁顺序)
    
    3
    
    void safe_transfer(Account *a, Account *b, int amount) {
    
    4
    
        Account *first = (a < b) ? a : b;   // 地址小的先锁
    
    5
    
        Account *second = (a < b) ? b : a;
    
    6
    
        pthread_mutex_lock(&first->lock);
    
    7
    
        pthread_mutex_lock(&second->lock);
    
    8
    
        // ... 转账操作 ...
    
    9
    
        pthread_mutex_unlock(&second->lock);
    
    10
    
        pthread_mutex_unlock(&first->lock);
    
    11
    
    }

### Q64: 线程与信号的交互？

> 🧠 **秒懂：** 多线程中信号发送给进程的任意线程(不确定哪个收到)。最佳实践：主线程设置信号掩码(所有线程继承)→专门一个线程sigwait处理信号。其他线程不受信号干扰。

多线程中信号处理需要特别注意：
    
    
    1
    
    // 问题: 信号被随机线程处理
    
    2
    
    
    
    
    3
    
    // 解决: 指定线程处理信号
    
    4
    
    sigset_t set;
    
    5
    
    sigemptyset(&set);
    
    6
    
    sigaddset(&set, SIGUSR1);
    
    7
    
    
    
    
    8
    
    // 主线程阻塞信号
    
    9
    
    pthread_sigmask(SIG_BLOCK, &set, NULL);
    
    10
    
    
    
    
    11
    
    // 创建专门的信号处理线程
    
    12
    
    void *signal_thread(void *arg) {
    
    13
    
        int sig;
    
    14
    
        while (1) {
    
    15
    
            sigwait(&set, &sig);  // 同步等待信号
    
    3 collapsed lines
    
    16
    
            printf("Got signal %d\n", sig);
    
    17
    
        }
    
    18
    
    }

### Q65: CPU亲和性(CPU Affinity)？

> 🧠 **秒懂：** CPU亲和性把线程绑定到特定CPU核心：sched_setaffinity。减少Cache失效(线程不会在核心间迁移)。嵌入式多核系统中把实时任务绑定到专用核心提高确定性。

绑定线程到特定CPU核，减少迁移开销：
    
    
    1
    
    #define _GNU_SOURCE
    
    2
    
    #include <sched.h>
    
    3
    
    
    
    
    4
    
    cpu_set_t cpuset;
    
    5
    
    CPU_ZERO(&cpuset);
    
    6
    
    CPU_SET(0, &cpuset);  // 绑定到CPU0
    
    7
    
    
    
    
    8
    
    // 设置线程亲和性
    
    9
    
    pthread_setaffinity_np(pthread_self(), sizeof(cpuset), &cpuset);
    
    10
    
    
    
    
    11
    
    // 或用sched_setaffinity设置进程
    
    12
    
    sched_setaffinity(0, sizeof(cpuset), &cpuset);

**嵌入式应用：** 大小核架构中将实时任务绑定到大核，将非关键任务绑定到小核。

### Q66: 线程安全的单例模式实现？

> 🧠 **秒懂：** 双检锁(DCLP)+volatile/atomic：if(!inst){lock(); if(!inst){inst=new Singleton;} unlock();}。C++11更简单：局部static(Meyers’ Singleton)保证线程安全。

C语言实现线程安全单例(无C++的static初始化保证)：
    
    
    1
    
    // 方法1: pthread_once(推荐)
    
    2
    
    static pthread_once_t once = PTHREAD_ONCE_INIT;
    
    3
    
    static Config *instance = NULL;
    
    4
    
    
    
    
    5
    
    void init_config(void) {
    
    6
    
        instance = malloc(sizeof(Config));
    
    7
    
        load_config(instance, "/etc/app.conf");
    
    8
    
    }
    
    9
    
    
    
    
    10
    
    Config *get_config(void) {
    
    11
    
        pthread_once(&once, init_config);
    
    12
    
        return instance;
    
    13
    
    }
    
    14
    
    
    
    
    15
    
    // 方法2: 静态初始化(简单场景)
    
    14 collapsed lines
    
    16
    
    static Config config = { .inited = 0 };
    
    17
    
    static pthread_mutex_t cfg_lock = PTHREAD_MUTEX_INITIALIZER;
    
    18
    
    
    
    
    19
    
    Config *get_config(void) {
    
    20
    
        if (!config.inited) {
    
    21
    
            pthread_mutex_lock(&cfg_lock);
    
    22
    
            if (!config.inited) {  // double-check
    
    23
    
                load_config(&config);
    
    24
    
                config.inited = 1;
    
    25
    
            }
    
    26
    
            pthread_mutex_unlock(&cfg_lock);
    
    27
    
        }
    
    28
    
        return &config;
    
    29
    
    }

### Q67: 无锁队列(Lock-free Queue)的原理？

> 🧠 **秒懂：** 无锁队列用CAS(Compare-And-Swap)原子操作替代互斥锁。入队/出队时先读指针→计算新指针→CAS更新(失败则重试)。避免锁的开销和死锁风险，但编程复杂。

无锁编程在高性能嵌入式系统中使用：
    
    
    1
    
    // 单生产者-单消费者无锁环形队列(最常用)
    
    2
    
    #define QUEUE_SIZE 1024  // 必须是2的幂
    
    3
    
    
    
    
    4
    
    typedef struct {
    
    5
    
        int buffer[QUEUE_SIZE];
    
    6
    
        volatile unsigned int head;  // 消费者移动
    
    7
    
        volatile unsigned int tail;  // 生产者移动
    
    8
    
    } SPSCQueue;
    
    9
    
    
    
    
    10
    
    int enqueue(SPSCQueue *q, int item) {
    
    11
    
        unsigned int next = (q->tail + 1) & (QUEUE_SIZE - 1);
    
    12
    
        if (next == q->head) return -1;  // 满
    
    13
    
        q->buffer[q->tail] = item;
    
    14
    
        __sync_synchronize();  // 内存屏障
    
    15
    
        q->tail = next;
    
    10 collapsed lines
    
    16
    
        return 0;
    
    17
    
    }
    
    18
    
    
    
    
    19
    
    int dequeue(SPSCQueue *q, int *item) {
    
    20
    
        if (q->head == q->tail) return -1;  // 空
    
    21
    
        *item = q->buffer[q->head];
    
    22
    
        __sync_synchronize();
    
    23
    
        q->head = (q->head + 1) & (QUEUE_SIZE - 1);
    
    24
    
        return 0;
    
    25
    
    }

### Q68: eventfd用于线程/进程间通知？

> 🧠 **秒懂：** eventfd创建事件通知fd→write写入计数→read读出并清零(或减)。可以配合epoll使用。比pipe效率更高，是Linux下线程/进程间轻量级通知的推荐方式。

eventfd是Linux轻量级通知机制(替代pipe)：
    
    
    1
    
    #include <sys/eventfd.h>
    
    2
    
    
    
    
    3
    
    int efd = eventfd(0, EFD_NONBLOCK | EFD_SEMAPHORE);
    
    4
    
    
    
    
    5
    
    // 通知(写)
    
    6
    
    uint64_t val = 1;
    
    7
    
    write(efd, &val, sizeof(val));
    
    8
    
    
    
    
    9
    
    // 等待(读) - 可配合epoll
    
    10
    
    uint64_t val;
    
    11
    
    read(efd, &val, sizeof(val));  // val=通知次数
    
    12
    
    
    
    
    13
    
    // 配合epoll使用(高效等待)
    
    14
    
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = efd };
    
    15
    
    epoll_ctl(epfd, EPOLL_CTL_ADD, efd, &ev);

### Q69: timerfd定时器的使用？

> 🧠 **秒懂：** timerfd_create创建定时器fd→timerfd_settime设置定时→read阻塞等待到期(返回到期次数)。可以放入epoll统一管理。比signal方式更优雅、更可控。

timerfd将定时器封装为文件描述符，可与epoll集成：
    
    
    1
    
    #include <sys/timerfd.h>
    
    2
    
    
    
    
    3
    
    int tfd = timerfd_create(CLOCK_MONOTONIC, 0);
    
    4
    
    
    
    
    5
    
    // 设置1秒后首次触发，之后每500ms触发一次
    
    6
    
    struct itimerspec its;
    
    7
    
    its.it_value.tv_sec = 1;
    
    8
    
    its.it_value.tv_nsec = 0;
    
    9
    
    its.it_interval.tv_sec = 0;
    
    10
    
    its.it_interval.tv_nsec = 500000000;  // 500ms
    
    11
    
    timerfd_settime(tfd, 0, &its, NULL);
    
    12
    
    
    
    
    13
    
    // 等待定时器(配合epoll更佳)
    
    14
    
    uint64_t expirations;
    
    15
    
    read(tfd, &expirations, sizeof(expirations));
    
    1 collapsed line
    
    16
    
    printf("Timer fired %lu times\n", expirations);

### Q70: signalfd信号处理？

> 🧠 **秒懂：** signalfd将信号转换为文件描述符→用read读取信号信息→可以放入epoll统一管理。解决了信号处理函数中不能调用非异步安全函数的问题。现代Linux编程推荐。

signalfd将信号转为文件描述符(可与epoll统一事件处理)：
    
    
    1
    
    #include <sys/signalfd.h>
    
    2
    
    
    
    
    3
    
    sigset_t mask;
    
    4
    
    sigemptyset(&mask);
    
    5
    
    sigaddset(&mask, SIGINT);
    
    6
    
    sigaddset(&mask, SIGTERM);
    
    7
    
    sigprocmask(SIG_BLOCK, &mask, NULL);
    
    8
    
    
    
    
    9
    
    int sfd = signalfd(-1, &mask, 0);
    
    10
    
    
    
    
    11
    
    // 用read读取信号信息(而非异步signal handler)
    
    12
    
    struct signalfd_siginfo info;
    
    13
    
    read(sfd, &info, sizeof(info));
    
    14
    
    printf("Got signal %d from PID %d\n", info.ssi_signo, info.ssi_pid);

* * *

## 五、网络编程（Q71~Q80）

### Q71: socket编程基本流程(TCP)？

> 🧠 **秒懂：** TCP服务器：socket→bind→listen→accept→read/write→close。TCP客户端：socket→connect→read/write→close。TCP面向连接可靠传输。是网络编程的基本功。

TCP客户端-服务器是嵌入式网络编程的基础：
    
    
    1
    
    // 服务端
    
    2
    
    int sfd = socket(AF_INET, SOCK_STREAM, 0);
    
    3
    
    int opt = 1;
    
    4
    
    setsockopt(sfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    5
    
    
    
    
    6
    
    struct sockaddr_in addr = {
    
    7
    
        .sin_family = AF_INET,
    
    8
    
        .sin_port = htons(8080),
    
    9
    
        .sin_addr.s_addr = INADDR_ANY
    
    10
    
    };
    
    11
    
    bind(sfd, (struct sockaddr *)&addr, sizeof(addr));
    
    12
    
    listen(sfd, 5);
    
    13
    
    
    
    
    14
    
    int cfd = accept(sfd, NULL, NULL);
    
    15
    
    char buf[1024];
    
    14 collapsed lines
    
    16
    
    int n = read(cfd, buf, sizeof(buf));
    
    17
    
    write(cfd, buf, n);  // 回显
    
    18
    
    close(cfd);
    
    19
    
    close(sfd);
    
    20
    
    
    
    
    21
    
    // 客户端
    
    22
    
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    
    23
    
    struct sockaddr_in srv = {
    
    24
    
        .sin_family = AF_INET,
    
    25
    
        .sin_port = htons(8080)
    
    26
    
    };
    
    27
    
    inet_pton(AF_INET, "192.168.1.1", &srv.sin_addr);
    
    28
    
    connect(fd, (struct sockaddr *)&srv, sizeof(srv));
    
    29
    
    write(fd, "hello", 5);

> 💡 **面试追问：** TCP为什么要三次握手？两次行不行？TIME_WAIT是什么？为什么需要？ 🔧 **嵌入式建议：** 服务端必须设SO_REUSEADDR(避免TIME_WAIT绑定失败);嵌入式TCP要设keepalive检测断线。

### Q72: UDP编程与TCP的区别？

> 🧠 **秒懂：** UDP无连接：sendto/recvfrom直接发送/接收(无需connect/accept)。比TCP快但不保证可靠——可能丢包、乱序、重复。嵌入式中用于实时性要求高但允许少量丢包的场景。

UDP是无连接的传输层协议，适合实时性要求高的嵌入式通信：
    
    
    1
    
    // UDP发送
    
    2
    
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    
    3
    
    struct sockaddr_in dest = {
    
    4
    
        .sin_family = AF_INET,
    
    5
    
        .sin_port = htons(9000)
    
    6
    
    };
    
    7
    
    inet_pton(AF_INET, "192.168.1.100", &dest.sin_addr);
    
    8
    
    sendto(fd, "data", 4, 0, (struct sockaddr *)&dest, sizeof(dest));
    
    9
    
    
    
    
    10
    
    // UDP接收
    
    11
    
    bind(fd, (struct sockaddr *)&local, sizeof(local));
    
    12
    
    struct sockaddr_in from;
    
    13
    
    socklen_t len = sizeof(from);
    
    14
    
    int n = recvfrom(fd, buf, sizeof(buf), 0,
    
    15
    
                     (struct sockaddr *)&from, &len);

TCP| UDP  
---|---  
面向连接| 无连接  
可靠(重传/排序)| 不可靠(可能丢/乱序)  
字节流| 数据报(有边界)  
适合文件传输| 适合音视频/传感器数据  
  
### Q73: 网络字节序转换？

> 🧠 **秒懂：** 网络字节序是大端(Big-Endian)。htonl/htons(主机→网络)、ntohl/ntohs(网络→主机)。发送前转网络序，接收后转主机序。不转换在小端机器上收发的数据会乱。

网络通信中字节序问题是嵌入式常见bug来源：
    
    
    1
    
    #include <arpa/inet.h>
    
    2
    
    
    
    
    3
    
    // 主机→网络
    
    4
    
    uint16_t net_port = htons(8080);       // host to network short
    
    5
    
    uint32_t net_addr = htonl(0xC0A80101); // host to network long
    
    6
    
    
    
    
    7
    
    // 网络→主机
    
    8
    
    uint16_t host_port = ntohs(net_port);
    
    9
    
    uint32_t host_addr = ntohl(net_addr);
    
    10
    
    
    
    
    11
    
    // IP地址转换
    
    12
    
    struct in_addr addr;
    
    13
    
    inet_pton(AF_INET, "192.168.1.1", &addr);  // 字符串→二进制
    
    14
    
    char str[INET_ADDRSTRLEN];
    
    15
    
    inet_ntop(AF_INET, &addr, str, sizeof(str)); // 二进制→字符串

### Q74: setsockopt常用选项？

> 🧠 **秒懂：** SO_REUSEADDR(地址复用，避免TIME_WAIT)、SO_KEEPALIVE(TCP保活)、TCP_NODELAY(关闭Nagle)、SO_RCVBUF/SO_SNDBUF(缓冲区大小)。嵌入式网络服务必须设SO_REUSEADDR。

socket选项设置是网络编程必须掌握的：
    
    
    1
    
    int opt = 1;
    
    2
    
    // 地址复用(避免TIME_WAIT导致bind失败)
    
    3
    
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    4
    
    
    
    
    5
    
    // 设置发送/接收缓冲区
    
    6
    
    int bufsize = 65536;
    
    7
    
    setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &bufsize, sizeof(bufsize));
    
    8
    
    setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &bufsize, sizeof(bufsize));
    
    9
    
    
    
    
    10
    
    // TCP_NODELAY(禁用Nagle算法，减少延迟)
    
    11
    
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));
    
    12
    
    
    
    
    13
    
    // 设置超时
    
    14
    
    struct timeval tv = { .tv_sec = 5, .tv_usec = 0 };
    
    15
    
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    
    3 collapsed lines
    
    16
    
    
    
    
    17
    
    // Keepalive(检测断连)
    
    18
    
    setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &opt, sizeof(opt));

### Q75: 非阻塞IO与epoll结合？

> 🧠 **秒懂：** 非阻塞socket+epoll_wait等待事件→读/写直到EAGAIN→继续等待。epoll_ctl添加/修改/删除监控的fd。是Linux高性能网络服务器的标准范式。

这是嵌入式高性能网络服务器的核心模式：
    
    
    1
    
    // 设置非阻塞
    
    2
    
    int flags = fcntl(fd, F_GETFL);
    
    3
    
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
    
    4
    
    
    
    
    5
    
    // epoll + 非阻塞(reactor模式)
    
    6
    
    int epfd = epoll_create1(0);
    
    7
    
    struct epoll_event ev = { .events = EPOLLIN | EPOLLET, .data.fd = fd };
    
    8
    
    epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev);
    
    9
    
    
    
    
    10
    
    struct epoll_event events[128];
    
    11
    
    while (1) {
    
    12
    
        int n = epoll_wait(epfd, events, 128, -1);
    
    13
    
        for (int i = 0; i < n; i++) {
    
    14
    
            if (events[i].data.fd == listen_fd) {
    
    15
    
                accept_new_connection(listen_fd);
    
    11 collapsed lines
    
    16
    
            } else if (events[i].events & EPOLLIN) {
    
    17
    
                // 非阻塞读(ET模式必须循环读)
    
    18
    
                while (1) {
    
    19
    
                    int ret = read(events[i].data.fd, buf, sizeof(buf));
    
    20
    
                    if (ret < 0 && errno == EAGAIN) break;
    
    21
    
                    if (ret <= 0) { close_connection(); break; }
    
    22
    
                    process_data(buf, ret);
    
    23
    
                }
    
    24
    
            }
    
    25
    
        }
    
    26
    
    }

### Q76: TCP粘包问题和解决方案？

> 🧠 **秒懂：** TCP是字节流，没有消息边界。粘包：多个消息粘在一起。解决方案：①固定长度 ②消息头+长度字段+数据 ③特殊分隔符(如\n)。嵌入式自定义协议通常用方案②。

TCP是字节流协议，没有消息边界，需要应用层分包：
    
    
    1
    
    // 方案1: 固定长度
    
    2
    
    #define MSG_LEN 128
    
    3
    
    char buf[MSG_LEN];
    
    4
    
    int total = 0;
    
    5
    
    while (total < MSG_LEN) {
    
    6
    
        int n = read(fd, buf + total, MSG_LEN - total);
    
    7
    
        if (n <= 0) break;
    
    8
    
        total += n;
    
    9
    
    }
    
    10
    
    
    
    
    11
    
    // 方案2: 长度+数据(最常用)
    
    12
    
    typedef struct {
    
    13
    
        uint32_t len;      // 网络字节序
    
    14
    
        char data[0];      // 柔性数组
    
    15
    
    } Packet;
    
    15 collapsed lines
    
    16
    
    
    
    
    17
    
    // 发送
    
    18
    
    uint32_t len = htonl(data_len);
    
    19
    
    write(fd, &len, 4);
    
    20
    
    write(fd, data, data_len);
    
    21
    
    
    
    
    22
    
    // 接收
    
    23
    
    uint32_t len;
    
    24
    
    read_n(fd, &len, 4);
    
    25
    
    len = ntohl(len);
    
    26
    
    char *data = malloc(len);
    
    27
    
    read_n(fd, data, len);
    
    28
    
    
    
    
    29
    
    // 方案3: 分隔符(如\n)
    
    30
    
    // 适合文本协议(HTTP, SMTP)

### Q77: 多路复用实现简单HTTP服务器？

> 🧠 **秒懂：** epoll管理所有连接fd+listen fd→新连接到来accept并加入epoll→数据到来read并处理→发送响应write→关闭连接。单线程即可处理上千连接。

嵌入式设备常需要提供Web配置页面：
    
    
    1
    
    void handle_http(int fd) {
    
    2
    
        char buf[4096];
    
    3
    
        int n = read(fd, buf, sizeof(buf) - 1);
    
    4
    
        buf[n] = '\0';
    
    5
    
    
    
    
    6
    
        // 简易HTTP响应
    
    7
    
        const char *response =
    
    8
    
            "HTTP/1.1 200 OK\r\n"
    
    9
    
            "Content-Type: text/html\r\n"
    
    10
    
            "Content-Length: 13\r\n"
    
    11
    
            "\r\n"
    
    12
    
            "Hello World!\n";
    
    13
    
        write(fd, response, strlen(response));
    
    14
    
        close(fd);
    
    15
    
    }

### Q78: 多播(Multicast)编程？

> 🧠 **秒懂：** 多播让一个数据包同时发送给一组接收者(一对多)。setsockopt设置IP_ADD_MEMBERSHIP加入多播组。嵌入式中用于设备发现(mDNS)、实时数据分发。

多播用于一对多通信(如设备发现、传感器广播)：
    
    
    1
    
    // 发送多播
    
    2
    
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    
    3
    
    struct sockaddr_in mcast_addr = {
    
    4
    
        .sin_family = AF_INET,
    
    5
    
        .sin_port = htons(5000)
    
    6
    
    };
    
    7
    
    inet_pton(AF_INET, "239.1.1.1", &mcast_addr.sin_addr);
    
    8
    
    sendto(fd, "discover", 8, 0, (struct sockaddr *)&mcast_addr, sizeof(mcast_addr));
    
    9
    
    
    
    
    10
    
    // 接收多播
    
    11
    
    struct ip_mreq mreq;
    
    12
    
    inet_pton(AF_INET, "239.1.1.1", &mreq.imr_multiaddr);
    
    13
    
    mreq.imr_interface.s_addr = INADDR_ANY;
    
    14
    
    setsockopt(fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq));
    
    15
    
    bind(fd, (struct sockaddr *)&local, sizeof(local));
    
    1 collapsed line
    
    16
    
    recvfrom(fd, buf, sizeof(buf), 0, NULL, NULL);

### Q79: raw socket原始套接字？

> 🧠 **秒懂：** 原始套接字(SOCK_RAW)绕过TCP/UDP直接操作IP层或链路层。可以构造自定义协议包、抓包分析。嵌入式中用于实现自定义网络协议或网络调试。

原始套接字可以自定义IP包头(网络调试/协议开发)：
    
    
    1
    
    // 创建原始套接字(需root)
    
    2
    
    int fd = socket(AF_INET, SOCK_RAW, IPPROTO_ICMP);
    
    3
    
    
    
    
    4
    
    // 接收ICMP包(如ping回复)
    
    5
    
    char buf[4096];
    
    6
    
    struct sockaddr_in from;
    
    7
    
    socklen_t len = sizeof(from);
    
    8
    
    int n = recvfrom(fd, buf, sizeof(buf), 0, (struct sockaddr *)&from, &len);
    
    9
    
    // buf包含IP头+ICMP头+数据

### Q80: 网络调试工具和方法？

> 🧠 **秒懂：** 工具：ping(连通性)、traceroute(路由)、netstat/ss(连接状态)、tcpdump(抓包)、wireshark(分析)、nc(网络调试瑞士军刀)、iperf(带宽测试)。嵌入式网络调试利器。

嵌入式网络问题调试常用工具：

Terminal window
    
    
    1
    
    # tcpdump - 抓包(嵌入式最常用)
    
    2
    
    tcpdump -i eth0 port 8080 -w capture.pcap
    
    3
    
    tcpdump -i eth0 host 192.168.1.100 -nn
    
    4
    
    
    
    
    5
    
    # netstat/ss - 连接状态
    
    6
    
    ss -tlnp          # 查看监听端口
    
    7
    
    ss -s             # 统计汇总
    
    8
    
    
    
    
    9
    
    # ping / traceroute - 连通性
    
    10
    
    ping -c 3 192.168.1.1
    
    11
    
    traceroute 8.8.8.8
    
    12
    
    
    
    
    13
    
    # nc(netcat) - 网络调试瑞士军刀
    
    14
    
    nc -l 8080         # 监听端口
    
    15
    
    nc 192.168.1.1 8080  # 连接
    
    1 collapsed line
    
    16
    
    echo "test" | nc -u 192.168.1.1 9000  # UDP发送

* * *

## 六、Shell脚本与自动化（Q81~Q90）

### Q81: Shell脚本中的变量和参数？

> 🧠 **秒懂：** 变量赋值(NAME=value，无空格)、引用($NAME或${NAME})、位置参数($1-$9)、特殊变量($?返回值/$#参数个数/$@所有参数/$$当前PID)。

Shell脚本在嵌入式系统启动、测试、部署中广泛使用：
    
    
    1
    
    #!/bin/bash
    
    2
    
    # 位置参数
    
    3
    
    echo "脚本名: $0"
    
    4
    
    echo "第一个参数: $1"
    
    5
    
    echo "所有参数: $@"
    
    6
    
    echo "参数个数: $#"
    
    7
    
    echo "上一命令返回值: $?"
    
    8
    
    echo "当前PID: $$"
    
    9
    
    
    
    
    10
    
    # 变量操作
    
    11
    
    STR="hello world"
    
    12
    
    echo ${#STR}         # 字符串长度: 11
    
    13
    
    echo ${STR:0:5}      # 子串: hello
    
    14
    
    echo ${STR/world/linux}  # 替换: hello linux
    
    15
    
    echo ${STR^^}        # 大写: HELLO WORLD

### Q82: Shell条件判断和循环？

> 🧠 **秒懂：** if [ 条件 ]; then … fi。for i in list; do … done。while [ 条件 ]; do … done。case $var in pattern) … ;; esac。注意[和]周围必须有空格。

自动化测试脚本的核心结构：
    
    
    1
    
    #!/bin/bash
    
    2
    
    # 文件判断
    
    3
    
    [ -f "$1" ] && echo "是普通文件"
    
    4
    
    [ -d "$1" ] && echo "是目录"
    
    5
    
    [ -x "$1" ] && echo "有执行权限"
    
    6
    
    
    
    
    7
    
    # 字符串判断
    
    8
    
    [ -z "$VAR" ] && echo "空字符串"
    
    9
    
    [ "$A" = "$B" ] && echo "相等"
    
    10
    
    
    
    
    11
    
    # 数值判断
    
    12
    
    [ $a -eq $b ]  # 等于
    
    13
    
    [ $a -gt $b ]  # 大于
    
    14
    
    [ $a -lt $b ]  # 小于
    
    15
    
    
    
    
    9 collapsed lines
    
    16
    
    # for循环
    
    17
    
    for file in /dev/ttyUSB*; do
    
    18
    
        echo "Found serial port: $file"
    
    19
    
    done
    
    20
    
    
    
    
    21
    
    # while循环读取文件
    
    22
    
    while IFS=',' read -r name value; do
    
    23
    
        echo "$name = $value"
    
    24
    
    done < config.csv

### Q83: Shell中的函数和返回值？

> 🧠 **秒懂：** function fname() { … return N; }。return返回退出状态(0-255)，不是返回值。函数输出用echo→命令替换$(fname)获取。函数中的变量默认全局，用local声明局部。

Shell函数用于封装重复操作：
    
    
    1
    
    #!/bin/bash
    
    2
    
    # 函数定义
    
    3
    
    check_device() {
    
    4
    
        local device=$1
    
    5
    
        if [ -c "$device" ]; then
    
    6
    
            echo "Device $device ok"
    
    7
    
            return 0
    
    8
    
        else
    
    9
    
            echo "Device $device not found"
    
    10
    
            return 1
    
    11
    
        fi
    
    12
    
    }
    
    13
    
    
    
    
    14
    
    # 函数调用
    
    15
    
    check_device "/dev/ttyS0"
    
    10 collapsed lines
    
    16
    
    if [ $? -eq 0 ]; then
    
    17
    
        echo "Ready to communicate"
    
    18
    
    fi
    
    19
    
    
    
    
    20
    
    # 获取函数输出
    
    21
    
    get_ip() {
    
    22
    
        ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
    
    23
    
    }
    
    24
    
    MY_IP=$(get_ip)
    
    25
    
    echo "My IP: $MY_IP"

### Q84: Shell文本处理(grep/sed/awk)？

> 🧠 **秒懂：** grep -r ‘pattern’ dir(搜索文件内容)。sed ‘s/old/new/g’ file(批量替换)。awk ‘{print $1,$3}’ file(按列处理)。三剑客组合能处理几乎所有文本分析需求。

嵌入式日志分析和数据处理的核心工具：

Terminal window
    
    
    1
    
    # grep - 搜索匹配
    
    2
    
    grep -r "error" /var/log/          # 递归搜索
    
    3
    
    grep -n "pattern" file              # 显示行号
    
    4
    
    grep -c "warning" log.txt           # 计数
    
    5
    
    grep -E "err|warn|fail" log.txt     # 正则
    
    6
    
    
    
    
    7
    
    # sed - 流编辑
    
    8
    
    sed -i 's/old/new/g' file          # 原地替换
    
    9
    
    sed -n '10,20p' file               # 打印10-20行
    
    10
    
    sed '/^#/d' config.txt              # 删除注释行
    
    11
    
    
    
    
    12
    
    # awk - 列处理
    
    13
    
    awk '{print $1, $3}' file          # 打印第1和第3列
    
    14
    
    awk -F: '{print $1}' /etc/passwd   # 指定分隔符
    
    15
    
    awk '$3 > 100 {print $0}' data     # 条件过滤
    
    1 collapsed line
    
    16
    
    awk '{sum+=$1} END{print sum}' file  # 求和

### Q85: Shell脚本实现自动化测试？

> 🧠 **秒懂：** Shell脚本实现自动化测试：运行程序→对比输出和期望值→统计通过/失败数→生成报告。嵌入式中用于自动化烧录测试、串口回归测试、批量固件验证。

嵌入式设备自动化测试脚本示例：
    
    
    1
    
    #!/bin/bash
    
    2
    
    # 串口通信测试
    
    3
    
    DEVICE="/dev/ttyUSB0"
    
    4
    
    BAUD=115200
    
    5
    
    PASS=0
    
    6
    
    FAIL=0
    
    7
    
    
    
    
    8
    
    test_uart() {
    
    9
    
        local cmd=$1
    
    10
    
        local expect=$2
    
    11
    
    
    
    
    12
    
        # 发送命令并等待回复
    
    13
    
        echo "$cmd" > "$DEVICE"
    
    14
    
        sleep 0.5
    
    15
    
        local response=$(timeout 2 cat "$DEVICE")
    
    20 collapsed lines
    
    16
    
    
    
    
    17
    
        if echo "$response" | grep -q "$expect"; then
    
    18
    
            echo "[PASS] $cmd -> $expect"
    
    19
    
            ((PASS++))
    
    20
    
        else
    
    21
    
            echo "[FAIL] $cmd -> got: $response"
    
    22
    
            ((FAIL++))
    
    23
    
        fi
    
    24
    
    }
    
    25
    
    
    
    
    26
    
    # 配置串口
    
    27
    
    stty -F "$DEVICE" $BAUD cs8 -parenb -cstopb
    
    28
    
    
    
    
    29
    
    # 执行测试
    
    30
    
    test_uart "AT" "OK"
    
    31
    
    test_uart "AT+VERSION?" "V1."
    
    32
    
    test_uart "AT+BAUD?" "$BAUD"
    
    33
    
    
    
    
    34
    
    echo "Results: $PASS passed, $FAIL failed"
    
    35
    
    [ $FAIL -eq 0 ] && exit 0 || exit 1

### Q86: Makefile自动化构建？

> 🧠 **秒懂：** Makefile高级：伪目标(.PHONY)、条件编译(ifeq)、include包含、自动依赖生成(gcc -MMD)、多目录编译。嵌入式项目模板：定义CROSS_COMPILE、CFLAGS、链接脚本路径。

Makefile是嵌入式项目构建的标准工具：
    
    
    1
    
    # 嵌入式项目典型Makefile
    
    2
    
    CROSS_COMPILE ?= arm-linux-gnueabihf-
    
    3
    
    CC = $(CROSS_COMPILE)gcc  # 编译器
    
    4
    
    CFLAGS = -Wall -O2 -g  # 编译选项
    
    5
    
    LDFLAGS = -lpthread  # 链接选项
    
    6
    
    
    
    
    7
    
    SRC = $(wildcard src/*.c)  # 源文件
    
    8
    
    OBJ = $(SRC:.c=.o)  # 目标文件
    
    9
    
    TARGET = myapp  # 输出文件名
    
    10
    
    
    
    
    11
    
    all: $(TARGET)  # 默认构建目标
    
    12
    
    
    
    
    13
    
    $(TARGET): $(OBJ)
    
    14
    
      $(CC) $(LDFLAGS) $^ -o $@
    
    15
    
    
    
    
    10 collapsed lines
    
    16
    
    %.o: %.c  # 构建目标: %.o
    
    17
    
      $(CC) $(CFLAGS) -c $< -o $@
    
    18
    
    
    
    
    19
    
    clean:  # 清理构建产物
    
    20
    
      rm -f $(OBJ) $(TARGET)
    
    21
    
    
    
    
    22
    
    install: $(TARGET)  # 默认构建目标
    
    23
    
      cp $(TARGET) /opt/rootfs/usr/bin/
    
    24
    
    
    
    
    25
    
    .PHONY: all clean install  # 声明伪目标

### Q87: CMake在嵌入式中的使用？

> 🧠 **秒懂：** CMake是跨平台构建系统：CMakeLists.txt定义项目→cmake生成Makefile→make编译。嵌入式中设置toolchain file指定交叉编译器。比手写Makefile更易维护和移植。

现代嵌入式项目越来越多使用CMake管理构建：
    
    
    1
    
    cmake_minimum_required(VERSION 3.10)
    
    2
    
    project(EmbeddedApp C)
    
    3
    
    
    
    
    4
    
    # 交叉编译工具链
    
    5
    
    set(CMAKE_C_COMPILER arm-linux-gnueabihf-gcc)
    
    6
    
    set(CMAKE_SYSTEM_NAME Linux)
    
    7
    
    set(CMAKE_SYSTEM_PROCESSOR arm)
    
    8
    
    
    
    
    9
    
    # 编译选项
    
    10
    
    add_compile_options(-Wall -O2)
    
    11
    
    
    
    
    12
    
    # 源文件
    
    13
    
    file(GLOB SOURCES "src/*.c")
    
    14
    
    
    
    
    15
    
    # 生成可执行文件
    
    5 collapsed lines
    
    16
    
    add_executable(myapp ${SOURCES})
    
    17
    
    target_link_libraries(myapp pthread)
    
    18
    
    
    
    
    19
    
    # 安装规则
    
    20
    
    install(TARGETS myapp DESTINATION /opt/rootfs/usr/bin)

### Q88: 嵌入式系统启动脚本编写？

> 🧠 **秒懂：** 启动脚本(/etc/init.d/或systemd的.service文件)控制系统服务的启动/停止/重启。嵌入式中编写启动脚本：挂载文件系统→配置网络→启动看门狗→启动应用程序。

嵌入式Linux系统启动脚本(init.d风格)：

/etc/init.d/myservice
    
    
    1
    
    #!/bin/sh
    
    2
    
    DAEMON=/usr/bin/myapp
    
    3
    
    PIDFILE=/var/run/myapp.pid
    
    4
    
    NAME="myapp"
    
    5
    
    
    
    
    6
    
    start() {
    
    7
    
        echo "Starting $NAME..."
    
    8
    
        start-stop-daemon -S -b -m -p $PIDFILE -x $DAEMON
    
    9
    
    }
    
    10
    
    
    
    
    11
    
    stop() {
    
    12
    
        echo "Stopping $NAME..."
    
    13
    
        start-stop-daemon -K -p $PIDFILE
    
    14
    
        rm -f $PIDFILE
    
    8 collapsed lines
    
    15
    
    }
    
    16
    
    
    
    
    17
    
    case "$1" in
    
    18
    
        start) start ;;
    
    19
    
        stop) stop ;;
    
    20
    
        restart) stop; sleep 1; start ;;
    
    21
    
        *) echo "Usage: $0 {start|stop|restart}" ;;
    
    22
    
    esac

### Q89: Python在嵌入式测试中的应用？

> 🧠 **秒懂：** Python在嵌入式测试中：pyserial串口通信、pexpect自动化交互、pytest测试框架、matplotlib数据可视化。PC端的测试上位机常用Python快速开发。

Python脚本用于嵌入式设备测试和数据分析：
    
    
    1
    
    import serial
    
    2
    
    import time
    
    3
    
    
    
    
    4
    
    # 串口通信测试
    
    5
    
    ser = serial.Serial('/dev/ttyUSB0', 115200, timeout=2)
    
    6
    
    
    
    
    7
    
    def send_cmd(cmd, expect='OK'):
    
    8
    
        ser.write((cmd + '\r\n').encode())
    
    9
    
        time.sleep(0.5)
    
    10
    
        response = ser.read(ser.in_waiting).decode()
    
    11
    
        assert expect in response, f"Expected '{expect}', got '{response}'"
    
    12
    
        print(f"[PASS] {cmd}")
    
    13
    
    
    
    
    14
    
    # 执行测试
    
    15
    
    send_cmd('AT')
    
    5 collapsed lines
    
    16
    
    send_cmd('AT+RST', 'ready')
    
    17
    
    send_cmd('AT+GMR', 'V1.')
    
    18
    
    
    
    
    19
    
    ser.close()
    
    20
    
    print("All tests passed!")

### Q90: 嵌入式日志系统设计？

> 🧠 **秒懂：** 日志系统设计：分级(ERROR/WARN/INFO/DEBUG)→带时间戳→支持输出到串口/文件/网络→环形缓冲区→可运行时调整日志级别。嵌入式中日志是定位现场问题的关键手段。

嵌入式系统日志是调试和运维的重要工具：
    
    
    1
    
    // 关键系统调用示例(见各函数注释)
    
    2
    
    #include <stdarg.h>
    
    3
    
    #include <time.h>
    
    4
    
    
    
    
    5
    
    typedef enum { LOG_DEBUG, LOG_INFO, LOG_WARN, LOG_ERROR } LogLevel;  // 枚举定义
    
    6
    
    static LogLevel g_level = LOG_INFO;
    
    7
    
    static FILE *g_logfile = NULL;
    
    8
    
    
    
    
    9
    
    void log_init(const char *path, LogLevel level) {
    
    10
    
        g_logfile = fopen(path, "a");
    
    11
    
        g_level = level;
    
    12
    
    }
    
    13
    
    
    
    
    14
    
    void log_msg(LogLevel level, const char *fmt, ...) {
    
    15
    
        if (level < g_level) return;
    
    18 collapsed lines
    
    16
    
    
    
    
    17
    
        const char *tags[] = {"DBG", "INF", "WRN", "ERR"};
    
    18
    
        time_t now = time(NULL);
    
    19
    
        struct tm *t = localtime(&now);
    
    20
    
    
    
    
    21
    
        fprintf(g_logfile, "[%02d:%02d:%02d][%s] ",
    
    22
    
                t->tm_hour, t->tm_min, t->tm_sec, tags[level]);
    
    23
    
    
    
    
    24
    
        va_list ap;
    
    25
    
        va_start(ap, fmt);
    
    26
    
        vfprintf(g_logfile, fmt, ap);
    
    27
    
        va_end(ap);
    
    28
    
        fprintf(g_logfile, "\n");
    
    29
    
        fflush(g_logfile);
    
    30
    
    }
    
    31
    
    
    
    
    32
    
    #define LOG_I(fmt, ...) log_msg(LOG_INFO, fmt, ##__VA_ARGS__)
    
    33
    
    #define LOG_E(fmt, ...) log_msg(LOG_ERROR, fmt, ##__VA_ARGS__)

* * *

## 七、高级主题（Q91~Q125）

### Q91: Linux下串口编程？

> 🧠 **秒懂：** 打开串口open(/dev/ttyS0)→tcgetattr获取属性→cfsetispeed/cfsetospeed设波特率→设数据位/停止位/校验→tcsetattr应用→read/write通信→close。

嵌入式最常用的通信接口编程：
    
    
    1
    
    #include <termios.h>
    
    2
    
    #include <fcntl.h>
    
    3
    
    
    
    
    4
    
    int uart_open(const char *dev, int baud) {
    
    5
    
        int fd = open(dev, O_RDWR | O_NOCTTY);
    
    6
    
        if (fd < 0) return -1;
    
    7
    
    
    
    
    8
    
        struct termios tio;
    
    9
    
        tcgetattr(fd, &tio);
    
    10
    
    
    
    
    11
    
        // 设置波特率
    
    12
    
        cfsetispeed(&tio, baud);
    
    13
    
        cfsetospeed(&tio, baud);
    
    14
    
    
    
    
    15
    
        // 8N1
    
    19 collapsed lines
    
    16
    
        tio.c_cflag &= ~PARENB;   // 无校验
    
    17
    
        tio.c_cflag &= ~CSTOPB;   // 1停止位
    
    18
    
        tio.c_cflag &= ~CSIZE;
    
    19
    
        tio.c_cflag |= CS8;        // 8数据位
    
    20
    
        tio.c_cflag |= CLOCAL | CREAD;
    
    21
    
    
    
    
    22
    
        // 原始模式(非规范)
    
    23
    
        tio.c_lflag &= ~(ICANON | ECHO | ECHOE | ISIG);
    
    24
    
        tio.c_iflag &= ~(IXON | IXOFF | IXANY);
    
    25
    
        tio.c_oflag &= ~OPOST;
    
    26
    
    
    
    
    27
    
        // 超时设置
    
    28
    
        tio.c_cc[VMIN] = 0;
    
    29
    
        tio.c_cc[VTIME] = 10;  // 1秒超时
    
    30
    
    
    
    
    31
    
        tcsetattr(fd, TCSANOW, &tio);
    
    32
    
        tcflush(fd, TCIOFLUSH);
    
    33
    
        return fd;
    
    34
    
    }

> 💡 **面试追问：** termios的cflag/iflag/oflag/lflag各控制什么？怎么设置非规范模式？ 🔧 **嵌入式建议：** 串口是嵌入式Linux最常用的通信,调试/AT命令/传感器通信都靠它。推荐非规范模式+raw设置。

### Q92: I2C设备编程(Linux用户态)？

> 🧠 **秒懂：** 打开I2C设备(/dev/i2c-N)→ioctl设置从机地址(I2C_SLAVE)→write发送数据/read接收数据。或使用i2c_smbus_read/write系列函数。嵌入式Linux下访问传感器的标准方式。

通过/dev/i2c-x接口访问I2C设备：
    
    
    1
    
    #include <linux/i2c-dev.h>
    
    2
    
    #include <sys/ioctl.h>
    
    3
    
    
    
    
    4
    
    int i2c_read_reg(int fd, uint8_t addr, uint8_t reg, uint8_t *val) {
    
    5
    
        if (ioctl(fd, I2C_SLAVE, addr) < 0) return -1;  // 设备控制操作
    
    6
    
        if (write(fd, &reg, 1) != 1) return -1;
    
    7
    
        if (read(fd, val, 1) != 1) return -1;
    
    8
    
        return 0;
    
    9
    
    }
    
    10
    
    
    
    
    11
    
    int main() {
    
    12
    
        int fd = open("/dev/i2c-1", O_RDWR);  // 打开设备/文件
    
    13
    
        uint8_t val;
    
    14
    
        i2c_read_reg(fd, 0x68, 0x75, &val);  // 读MPU6050 WHO_AM_I
    
    15
    
        printf("WHO_AM_I: 0x%02x\n", val);
    
    2 collapsed lines
    
    16
    
        close(fd);  // 关闭文件描述符
    
    17
    
    }

### Q93: SPI设备编程(Linux用户态)？

> 🧠 **秒懂：** 打开SPI设备(/dev/spidevX.Y)→ioctl设置模式/速率/位宽(SPI_IOC_WR_MODE)→ioctl(SPI_IOC_MESSAGE)执行全双工传输。用户态SPI访问简单但实时性不如内核驱动。

通过/dev/spidevX.Y接口访问SPI设备：
    
    
    1
    
    #include <linux/spi/spidev.h>
    
    2
    
    #include <sys/ioctl.h>
    
    3
    
    
    
    
    4
    
    int spi_transfer(int fd, uint8_t *tx, uint8_t *rx, int len) {
    
    5
    
        struct spi_ioc_transfer tr = {
    
    6
    
            .tx_buf = (unsigned long)tx,
    
    7
    
            .rx_buf = (unsigned long)rx,
    
    8
    
            .len = len,
    
    9
    
            .speed_hz = 1000000,
    
    10
    
            .bits_per_word = 8,
    
    11
    
        };
    
    12
    
        return ioctl(fd, SPI_IOC_MESSAGE(1), &tr);  // 设备控制操作
    
    13
    
    }
    
    14
    
    
    
    
    15
    
    int main() {
    
    10 collapsed lines
    
    16
    
        int fd = open("/dev/spidev0.0", O_RDWR);  // 打开设备/文件
    
    17
    
        uint8_t mode = SPI_MODE_0;
    
    18
    
        ioctl(fd, SPI_IOC_WR_MODE, &mode);  // 设备控制操作
    
    19
    
    
    
    
    20
    
        uint8_t tx[] = {0x9F};  // 读Flash JEDEC ID
    
    21
    
        uint8_t rx[4] = {0};
    
    22
    
        spi_transfer(fd, tx, rx, sizeof(tx));
    
    23
    
        printf("JEDEC: %02x %02x %02x\n", rx[1], rx[2], rx[3]);
    
    24
    
        close(fd);  // 关闭文件描述符
    
    25
    
    }

### Q94: GPIO操作(sysfs和libgpiod)？

> 🧠 **秒懂：** 旧方式：echo导出/设方向/读写sysfs文件(/sys/class/gpio/)。新方式：libgpiod(gpiod_chip_open→gpiod_line_request→set/get_value)。libgpiod更高效且支持事件监控。

嵌入式Linux中GPIO控制的两种方式：
    
    
    1
    
    // 方法1: sysfs(旧接口, 简单但将被废弃)
    
    2
    
    // echo 18 > /sys/class/gpio/export
    
    3
    
    // echo out > /sys/class/gpio/gpio18/direction
    
    4
    
    // echo 1 > /sys/class/gpio/gpio18/value
    
    5
    
    
    
    
    6
    
    // 方法2: libgpiod(新接口, 推荐)
    
    7
    
    #include <gpiod.h>
    
    8
    
    
    
    
    9
    
    struct gpiod_chip *chip = gpiod_chip_open("/dev/gpiochip0");
    
    10
    
    struct gpiod_line *line = gpiod_chip_get_line(chip, 18);
    
    11
    
    
    
    
    12
    
    // 输出
    
    13
    
    gpiod_line_request_output(line, "myapp", 0);
    
    14
    
    gpiod_line_set_value(line, 1);  // 高电平
    
    15
    
    
    
    
    8 collapsed lines
    
    16
    
    // 输入(带中断等待)
    
    17
    
    gpiod_line_request_rising_edge_events(line, "myapp");
    
    18
    
    struct gpiod_line_event event;
    
    19
    
    gpiod_line_event_wait(line, NULL);
    
    20
    
    gpiod_line_event_read(line, &event);
    
    21
    
    
    
    
    22
    
    gpiod_line_release(line);
    
    23
    
    gpiod_chip_close(chip);

### Q95: PWM控制(Linux sysfs)？

> 🧠 **秒懂：** 通过sysfs操作PWM：echo N > export→设置period和duty_cycle(纳秒单位)→echo 1 > enable。Linux PWM子系统统一管理，应用层操作简单。

嵌入式中PWM用于电机控制、LED调光等：

Terminal window
    
    
    1
    
    # sysfs PWM控制
    
    2
    
    echo 0 > /sys/class/pwm/pwmchip0/export
    
    3
    
    echo 1000000 > /sys/class/pwm/pwmchip0/pwm0/period      # 周期1ms(1kHz)
    
    4
    
    echo 500000 > /sys/class/pwm/pwmchip0/pwm0/duty_cycle   # 占空比50%
    
    5
    
    echo 1 > /sys/class/pwm/pwmchip0/pwm0/enable
    
    
    1
    
    // C代码操作PWM
    
    2
    
    void pwm_set(int chip, int channel, int period_ns, int duty_ns) {
    
    3
    
        char path[128];
    
    4
    
        sprintf(path, "/sys/class/pwm/pwmchip%d/pwm%d/period", chip, channel);
    
    5
    
        int fd = open(path, O_WRONLY);
    
    6
    
        dprintf(fd, "%d", period_ns);
    
    7
    
        close(fd);
    
    8
    
    
    
    
    9
    
        sprintf(path, "/sys/class/pwm/pwmchip%d/pwm%d/duty_cycle", chip, channel);
    
    10
    
        fd = open(path, O_WRONLY);
    
    11
    
        dprintf(fd, "%d", duty_ns);
    
    12
    
        close(fd);
    
    13
    
    }

### Q96: Linux下CAN总线编程？

> 🧠 **秒懂：** socketCAN：socket(PF_CAN, SOCK_RAW, CAN_RAW)→bind绑定can0接口→write发送CAN帧→read接收CAN帧。用ip link set can0 type can bitrate 500000配置波特率。

SocketCAN是Linux标准CAN接口：
    
    
    1
    
    #include <linux/can.h>
    
    2
    
    #include <net/if.h>
    
    3
    
    #include <sys/ioctl.h>
    
    4
    
    
    
    
    5
    
    int can_init(const char *ifname) {
    
    6
    
        int fd = socket(PF_CAN, SOCK_RAW, CAN_RAW);
    
    7
    
        struct ifreq ifr;
    
    8
    
        strncpy(ifr.ifr_name, ifname, IFNAMSIZ);
    
    9
    
        ioctl(fd, SIOCGIFINDEX, &ifr);  // 设备控制操作
    
    10
    
    
    
    
    11
    
        struct sockaddr_can addr = {
    
    12
    
            .can_family = AF_CAN,
    
    13
    
            .can_ifindex = ifr.ifr_ifindex
    
    14
    
        };
    
    15
    
        bind(fd, (struct sockaddr *)&addr, sizeof(addr));  // 绑定地址
    
    14 collapsed lines
    
    16
    
        return fd;
    
    17
    
    }
    
    18
    
    
    
    
    19
    
    // 发送CAN帧
    
    20
    
    struct can_frame frame;
    
    21
    
    frame.can_id = 0x123;
    
    22
    
    frame.can_dlc = 8;
    
    23
    
    memcpy(frame.data, "\x01\x02\x03\x04\x05\x06\x07\x08", 8);  // 内存拷贝
    
    24
    
    write(fd, &frame, sizeof(frame));
    
    25
    
    
    
    
    26
    
    // 接收CAN帧
    
    27
    
    struct can_frame rx;
    
    28
    
    read(fd, &rx, sizeof(rx));
    
    29
    
    printf("ID: 0x%X, Data[0]: 0x%X\n", rx.can_id, rx.data[0]);

### Q97: 内存映射IO(寄存器访问)？

> 🧠 **秒懂：** mmap映射/dev/mem或设备文件到用户空间→通过指针直接读写寄存器：volatile uint32_t *reg = mmap(…)。嵌入式Linux用户态调试硬件的快捷方法，但注意安全风险。

嵌入式Linux中通过/dev/mem或UIO直接访问硬件寄存器：
    
    
    1
    
    #include <sys/mman.h>
    
    2
    
    #include <fcntl.h>
    
    3
    
    
    
    
    4
    
    #define GPIO_BASE 0x3F200000  // 树莓派GPIO基地址
    
    5
    
    #define BLOCK_SIZE 4096
    
    6
    
    
    
    
    7
    
    int fd = open("/dev/mem", O_RDWR | O_SYNC);
    
    8
    
    volatile uint32_t *gpio = mmap(NULL, BLOCK_SIZE,
    
    9
    
                                    PROT_READ | PROT_WRITE,
    
    10
    
                                    MAP_SHARED, fd, GPIO_BASE);
    
    11
    
    
    
    
    12
    
    // 设置GPIO4为输出
    
    13
    
    gpio[0] |= (1 << 12);  // GPFSEL0: GPIO4 = output
    
    14
    
    
    
    
    15
    
    // 输出高电平
    
    7 collapsed lines
    
    16
    
    gpio[7] = (1 << 4);    // GPSET0: GPIO4 = 1
    
    17
    
    
    
    
    18
    
    // 输出低电平
    
    19
    
    gpio[10] = (1 << 4);   // GPCLR0: GPIO4 = 0
    
    20
    
    
    
    
    21
    
    munmap((void *)gpio, BLOCK_SIZE);
    
    22
    
    close(fd);

### Q98: watchdog看门狗编程？

> 🧠 **秒懂：** 打开/dev/watchdog→定期write喂狗→关闭时未写’V’则不停止看门狗(保持保护)。ioctl设超时时间(WDIOC_SETTIMEOUT)。嵌入式Linux系统可靠性的保障。

Linux下硬件看门狗的使用：
    
    
    1
    
    #include <linux/watchdog.h>
    
    2
    
    #include <sys/ioctl.h>
    
    3
    
    
    
    
    4
    
    int wdt_fd = open("/dev/watchdog", O_WRONLY);
    
    5
    
    
    
    
    6
    
    // 设置超时时间(秒)
    
    7
    
    int timeout = 10;
    
    8
    
    ioctl(wdt_fd, WDIOC_SETTIMEOUT, &timeout);
    
    9
    
    
    
    
    10
    
    // 喂狗(必须定期调用)
    
    11
    
    while (running) {
    
    12
    
        ioctl(wdt_fd, WDIOC_KEEPALIVE, NULL);
    
    13
    
        // 或者 write(wdt_fd, "1", 1);
    
    14
    
        sleep(5);  // 喂狗间隔 < 超时时间
    
    15
    
    }
    
    4 collapsed lines
    
    16
    
    
    
    
    17
    
    // 关闭看门狗(写入magic字符'V')
    
    18
    
    write(wdt_fd, "V", 1);
    
    19
    
    close(wdt_fd);

### Q99: D-Bus进程间通信？

> 🧠 **秒懂：** D-Bus是Linux桌面/嵌入式系统的进程间通信总线。系统总线(system bus)和会话总线(session bus)。嵌入式中用于系统服务间通信(如NetworkManager通知网络状态变化)。

D-Bus是Linux系统服务间通信的标准机制：
    
    
    1
    
    // 简化的D-Bus通信概念
    
    2
    
    // SystemD使用D-Bus管理服务
    
    3
    
    // 嵌入式中用于系统组件间消息传递
    
    4
    
    
    
    
    5
    
    // 命令行测试D-Bus:
    
    6
    
    // dbus-send --system --dest=org.freedesktop.NetworkManager //   /org/freedesktop/NetworkManager //   org.freedesktop.DBus.Properties.Get //   string:"org.freedesktop.NetworkManager" string:"State"

### Q100: Linux输入子系统(input)？

> 🧠 **秒懂：** Linux input子系统统一处理键盘/鼠标/触摸屏/按键等输入设备。应用层读取/dev/input/eventN→解析struct input_event(type/code/value)。嵌入式中用于按键和触摸屏。

嵌入式设备的按键、触摸屏、传感器数据通过input子系统上报：
    
    
    1
    
    // 关键系统调用示例(见各函数注释)
    
    2
    
    #include <linux/input.h>
    
    3
    
    
    
    
    4
    
    int fd = open("/dev/input/event0", O_RDONLY);
    
    5
    
    struct input_event ev;
    
    6
    
    
    
    
    7
    
    while (read(fd, &ev, sizeof(ev)) == sizeof(ev)) {
    
    8
    
        if (ev.type == EV_KEY) {
    
    9
    
            printf("Key %d %s\n", ev.code,
    
    10
    
                   ev.value ? "pressed" : "released");
    
    11
    
        } else if (ev.type == EV_ABS) {
    
    12
    
            printf("Abs axis %d value %d\n", ev.code, ev.value);
    
    13
    
        }
    
    14
    
    }

### Q101: V4L2视频采集编程？

> 🧠 **秒懂：** V4L2(Video for Linux 2)是Linux视频采集接口：open设备→VIDIOC_QUERYCAP查能力→设格式/缓冲区→STREAMON开始采集→mmap读取帧→STREAMOFF停止。摄像头程序的标准框架。

Video4Linux2是Linux视频采集标准接口(摄像头)：
    
    
    1
    
    #include <linux/videodev2.h>
    
    2
    
    
    
    
    3
    
    int fd = open("/dev/video0", O_RDWR);
    
    4
    
    
    
    
    5
    
    // 查询设备能力
    
    6
    
    struct v4l2_capability cap;
    
    7
    
    ioctl(fd, VIDIOC_QUERYCAP, &cap);
    
    8
    
    
    
    
    9
    
    // 设置格式
    
    10
    
    struct v4l2_format fmt;
    
    11
    
    fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    
    12
    
    fmt.fmt.pix.width = 640;
    
    13
    
    fmt.fmt.pix.height = 480;
    
    14
    
    fmt.fmt.pix.pixelformat = V4L2_PIX_FMT_YUYV;
    
    15
    
    ioctl(fd, VIDIOC_S_FMT, &fmt);
    
    9 collapsed lines
    
    16
    
    
    
    
    17
    
    // 请求缓冲区(mmap方式)
    
    18
    
    struct v4l2_requestbuffers req = {
    
    19
    
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE,
    
    20
    
        .memory = V4L2_MEMORY_MMAP,
    
    21
    
        .count = 4
    
    22
    
    };
    
    23
    
    ioctl(fd, VIDIOC_REQBUFS, &req);
    
    24
    
    // ... mmap缓冲区, 入队, 开始采集, 出队获取帧 ...

### Q102: ALSA音频编程？

> 🧠 **秒懂：** ALSA是Linux音频子系统：snd_pcm_open→设参数(采样率/位宽/通道)→snd_pcm_writei播放或snd_pcm_readi录音。嵌入式音频产品(语音交互/音响)的底层接口。

嵌入式音频播放/录制使用ALSA接口：
    
    
    1
    
    #include <alsa/asoundlib.h>
    
    2
    
    
    
    
    3
    
    snd_pcm_t *pcm;
    
    4
    
    snd_pcm_open(&pcm, "default", SND_PCM_STREAM_PLAYBACK, 0);
    
    5
    
    
    
    
    6
    
    // 设置参数
    
    7
    
    snd_pcm_set_params(pcm,
    
    8
    
        SND_PCM_FORMAT_S16_LE,    // 16位小端
    
    9
    
        SND_PCM_ACCESS_RW_INTERLEAVED,
    
    10
    
        2,                         // 双声道
    
    11
    
        44100,                     // 采样率
    
    12
    
        1,                         // 允许重采样
    
    13
    
        100000);                   // 延迟100ms
    
    14
    
    
    
    
    15
    
    // 播放PCM数据
    
    4 collapsed lines
    
    16
    
    short buffer[1024];
    
    17
    
    snd_pcm_writei(pcm, buffer, 512);  // 写512帧
    
    18
    
    
    
    
    19
    
    snd_pcm_close(pcm);

### Q103: Linux电源管理(suspend/resume)？

> 🧠 **秒懂：** Linux电源管理：echo mem > /sys/power/state进入挂起。驱动需实现suspend/resume回调保存/恢复硬件状态。嵌入式设备省电的关键——不使用时挂起外设或整个系统。

嵌入式设备的低功耗管理：

Terminal window
    
    
    1
    
    # 查看支持的睡眠模式
    
    2
    
    cat /sys/power/state
    
    3
    
    # 输出: freeze mem disk
    
    4
    
    
    
    
    5
    
    # 进入睡眠
    
    6
    
    echo mem > /sys/power/state    # 挂起到RAM(S3)
    
    7
    
    echo freeze > /sys/power/state  # 冻结(省电但不关外设)
    
    8
    
    
    
    
    9
    
    # 设置唤醒源
    
    10
    
    echo enabled > /sys/devices/.../power/wakeup
    
    11
    
    
    
    
    12
    
    # 用户空间电源管理(嵌入式应用)
    
    13
    
    # - 监控电池电量
    
    14
    
    # - 空闲时进入低功耗
    
    15
    
    # - GPIO中断唤醒

### Q104: syslog日志系统？

> 🧠 **秒懂：** syslog是Linux标准日志系统：openlog→syslog(priority, message)→closelog。日志写入/var/log/syslog。嵌入式中配置rsyslog远程发送日志到服务器便于集中分析。

嵌入式Linux使用syslog进行系统日志管理：
    
    
    1
    
    #include <syslog.h>
    
    2
    
    
    
    
    3
    
    // 打开日志
    
    4
    
    openlog("myapp", LOG_PID | LOG_CONS, LOG_DAEMON);
    
    5
    
    
    
    
    6
    
    // 写日志(不同级别)
    
    7
    
    syslog(LOG_INFO, "Application started, version %s", VERSION);
    
    8
    
    syslog(LOG_WARNING, "Temperature high: %d C", temp);
    
    9
    
    syslog(LOG_ERR, "Failed to open device: %s", strerror(errno));
    
    10
    
    
    
    
    11
    
    closelog();

Terminal window
    
    
    1
    
    # 查看日志
    
    2
    
    tail -f /var/log/syslog
    
    3
    
    journalctl -u myservice -f   # systemd系统

### Q105: 嵌入式文件系统操作(mount/umount)？

> 🧠 **秒懂：** mount -t type device dir挂载文件系统。嵌入式中开机脚本mount SD卡/NFS/tmpfs等。umount卸载前确保无进程使用(lsof/fuser检查)。remount可以改变挂载选项。

程序中动态挂载文件系统：
    
    
    1
    
    #include <sys/mount.h>
    
    2
    
    
    
    
    3
    
    // 挂载SD卡
    
    4
    
    mount("/dev/mmcblk0p1", "/mnt/sd", "vfat",
    
    5
    
          MS_NOEXEC | MS_NOSUID, "utf8");
    
    6
    
    
    
    
    7
    
    // 挂载tmpfs(内存文件系统)
    
    8
    
    mount("tmpfs", "/var/run", "tmpfs", 0, "size=10M");
    
    9
    
    
    
    
    10
    
    // 卸载
    
    11
    
    umount("/mnt/sd");
    
    12
    
    
    
    
    13
    
    // 同步文件系统缓存到磁盘
    
    14
    
    sync();

### Q106: netlink与内核通信？

> 🧠 **秒懂：** Netlink是内核与用户空间的通信机制(socket接口)。用于获取/配置网络接口(NETLINK_ROUTE)、监听内核事件(udev用NETLINK_KOBJECT_UEVENT)。比ioctl更灵活。

Netlink是Linux用户态与内核的通信通道(网络事件、设备热插拔等)：
    
    
    1
    
    #include <linux/netlink.h>
    
    2
    
    
    
    
    3
    
    // 监听内核uevent(设备热插拔)
    
    4
    
    int fd = socket(AF_NETLINK, SOCK_RAW, NETLINK_KOBJECT_UEVENT);
    
    5
    
    struct sockaddr_nl sa = {
    
    6
    
        .nl_family = AF_NETLINK,
    
    7
    
        .nl_groups = 1  // 内核广播组
    
    8
    
    };
    
    9
    
    bind(fd, (struct sockaddr *)&sa, sizeof(sa));
    
    10
    
    
    
    
    11
    
    char buf[4096];
    
    12
    
    while (1) {
    
    13
    
        int len = recv(fd, buf, sizeof(buf), 0);
    
    14
    
        printf("Event: %s\n", buf);
    
    15
    
        // 典型输出: add@/devices/usb/... (USB设备插入)
    
    1 collapsed line
    
    16
    
    }

### Q107: 定时器的使用(timer_create/setitimer)？

> 🧠 **秒懂：** POSIX定时器timer_create→timer_settime设置(一次性/重复)→到期发信号或通知线程。旧接口setitimer更简单但功能少。也可以用timerfd配合epoll(更现代)。

Linux下定时器的多种实现方式：
    
    
    1
    
    // 方法1: POSIX定时器(推荐)
    
    2
    
    #include <signal.h>
    
    3
    
    #include <time.h>
    
    4
    
    
    
    
    5
    
    void timer_handler(int sig, siginfo_t *si, void *uc) {
    
    6
    
        printf("Timer expired!\n");
    
    7
    
    }
    
    8
    
    
    
    
    9
    
    timer_t timerid;
    
    10
    
    struct sigevent sev = {
    
    11
    
        .sigev_notify = SIGEV_SIGNAL,
    
    12
    
        .sigev_signo = SIGRTMIN
    
    13
    
    };
    
    14
    
    timer_create(CLOCK_MONOTONIC, &sev, &timerid);
    
    15
    
    
    
    
    7 collapsed lines
    
    16
    
    struct itimerspec its = {
    
    17
    
        .it_value = { .tv_sec = 1 },     // 首次1秒后
    
    18
    
        .it_interval = { .tv_nsec = 500000000 }  // 之后每500ms
    
    19
    
    };
    
    20
    
    timer_settime(timerid, 0, &its, NULL);
    
    21
    
    
    
    
    22
    
    // 方法2: timerfd(可配合epoll，见Q69)

### Q108: 动态库的加载(dlopen/dlsym)？

> 🧠 **秒懂：** dlopen加载动态库→dlsym获取函数/变量地址→调用函数→dlclose关闭。实现插件机制：运行时根据配置加载不同模块。嵌入式中用于功能扩展和热更新。

运行时动态加载共享库(插件机制)：
    
    
    1
    
    #include <dlfcn.h>
    
    2
    
    
    
    
    3
    
    // 加载动态库
    
    4
    
    void *handle = dlopen("./libplugin.so", RTLD_LAZY);
    
    5
    
    if (!handle) {
    
    6
    
        fprintf(stderr, "dlopen: %s\n", dlerror());
    
    7
    
        return -1;
    
    8
    
    }
    
    9
    
    
    
    
    10
    
    // 获取函数指针
    
    11
    
    typedef int (*PluginFunc)(const char *);
    
    12
    
    PluginFunc func = dlsym(handle, "plugin_process");
    
    13
    
    if (!func) {
    
    14
    
        fprintf(stderr, "dlsym: %s\n", dlerror());
    
    15
    
    }
    
    6 collapsed lines
    
    16
    
    
    
    
    17
    
    // 调用
    
    18
    
    func("hello plugin");
    
    19
    
    
    
    
    20
    
    // 卸载
    
    21
    
    dlclose(handle);

### Q109: 进程间文件描述符传递(SCM_RIGHTS)？

> 🧠 **秒懂：** 通过Unix Domain Socket的辅助数据(ancillary data)传递fd：sendmsg发送SCM_RIGHTS消息→recvmsg接收。实现不同进程间共享文件描述符。用于进程间共享设备/连接。

通过Unix域套接字传递fd(高级IPC技巧)：
    
    
    1
    
    // 发送fd
    
    2
    
    void send_fd(int sock, int fd_to_send) {
    
    3
    
        struct msghdr msg = {0};
    
    4
    
        struct cmsghdr *cmsg;
    
    5
    
        char buf[CMSG_SPACE(sizeof(int))];
    
    6
    
    
    
    
    7
    
        msg.msg_control = buf;
    
    8
    
        msg.msg_controllen = sizeof(buf);
    
    9
    
        cmsg = CMSG_FIRSTHDR(&msg);
    
    10
    
        cmsg->cmsg_level = SOL_SOCKET;
    
    11
    
        cmsg->cmsg_type = SCM_RIGHTS;
    
    12
    
        cmsg->cmsg_len = CMSG_LEN(sizeof(int));
    
    13
    
        *(int *)CMSG_DATA(cmsg) = fd_to_send;
    
    14
    
    
    
    
    15
    
        struct iovec iov = { .iov_base = "x", .iov_len = 1 };
    
    4 collapsed lines
    
    16
    
        msg.msg_iov = &iov;
    
    17
    
        msg.msg_iovlen = 1;
    
    18
    
        sendmsg(sock, &msg, 0);
    
    19
    
    }

### Q110: Linux cron定时任务？

> 🧠 **秒懂：** crontab -e编辑定时任务：分/时/日/月/周 命令。嵌入式中用于定期日志清理、健康检查、数据上报。注意cron环境变量与交互式Shell不同。

嵌入式设备中的定时执行任务：

Terminal window
    
    
    1
    
    # crontab格式: 分 时 日 月 周 命令
    
    2
    
    # 每5分钟采集一次温度
    
    3
    
    */5 * * * * /usr/bin/read_temp >> /var/log/temp.log
    
    4
    
    
    
    
    5
    
    # 每天凌晨3点清理日志
    
    6
    
    0 3 * * * /usr/sbin/logrotate /etc/logrotate.conf
    
    7
    
    
    
    
    8
    
    # 每小时同步时间
    
    9
    
    0 * * * * ntpdate pool.ntp.org
    
    10
    
    
    
    
    11
    
    # 开机时执行
    
    12
    
    @reboot /usr/bin/myapp &

### Q111: select实现超时读取？

> 🧠 **秒懂：** fd_set集合→FD_SET添加fd→select(maxfd+1, &readfds, NULL, NULL, &timeout)→返回就绪fd数→FD_ISSET检查哪个fd就绪。超时返回0，错误返回-1。

在嵌入式中经常需要带超时的IO操作：
    
    
    1
    
    #include <sys/select.h>
    
    2
    
    
    
    
    3
    
    int read_timeout(int fd, char *buf, int len, int timeout_ms) {
    
    4
    
        fd_set fds;
    
    5
    
        FD_ZERO(&fds);
    
    6
    
        FD_SET(fd, &fds);
    
    7
    
    
    
    
    8
    
        struct timeval tv;
    
    9
    
        tv.tv_sec = timeout_ms / 1000;
    
    10
    
        tv.tv_usec = (timeout_ms % 1000) * 1000;
    
    11
    
    
    
    
    12
    
        int ret = select(fd + 1, &fds, NULL, NULL, &tv);
    
    13
    
        if (ret > 0 && FD_ISSET(fd, &fds)) {
    
    14
    
            return read(fd, buf, len);
    
    15
    
        } else if (ret == 0) {
    
    4 collapsed lines
    
    16
    
            return 0;  // 超时
    
    17
    
        }
    
    18
    
        return -1;  // 错误
    
    19
    
    }

### Q112: 嵌入式Linux内存优化？

> 🧠 **秒懂：** 嵌入式Linux内存优化：精简内核配置(make menuconfig)→使用busybox(替代完整命令)→静态链接减少库→strip去符号→调小栈大小→使用内存池→避免内存泄漏。

嵌入式设备内存资源有限，需要优化：

Terminal window
    
    
    1
    
    # 查看内存使用
    
    2
    
    free -m
    
    3
    
    cat /proc/meminfo
    
    4
    
    
    
    
    5
    
    # 清除缓存(释放页缓存)
    
    6
    
    echo 3 > /proc/sys/vm/drop_caches
    
    7
    
    
    
    
    8
    
    # 关闭swap(嵌入式通常不用swap)
    
    9
    
    swapoff -a
    
    10
    
    
    
    
    11
    
    # 使用busybox替代完整工具链(节省空间)
    
    12
    
    # 使用musl-libc替代glibc(更小)
    
    13
    
    # strip去除调试信息
    
    14
    
    arm-linux-gnueabihf-strip myapp
    
    
    1
    
    // 代码级优化
    
    2
    
    // 1. 避免内存碎片：使用内存池
    
    3
    
    // 2. 减少堆分配：尽量栈上分配或静态分配
    
    4
    
    // 3. 使用mmap映射大文件(按需加载)
    
    5
    
    // 4. 共享库减少内存占用(多进程共享代码段)

### Q113: 嵌入式设备热插拔处理(udev)？

> 🧠 **秒懂：** udev是Linux设备管理器：设备插拔时内核发送uevent→udev规则匹配→自动创建/删除设备节点、加载驱动、执行脚本。嵌入式中用于热插拔USB/SD卡的自动处理。

处理USB/SD卡等设备的动态插拔：

Terminal window
    
    
    1
    
    # udev规则示例 /etc/udev/rules.d/99-mydevice.rules
    
    2
    
    # USB设备插入时执行脚本
    
    3
    
    ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="1234", \
    
    4
    
      RUN+="/usr/bin/handle_usb.sh"
    
    5
    
    
    
    
    6
    
    # 串口设备固定名称
    
    7
    
    SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", SYMLINK+="my_serial"
    
    
    1
    
    // 程序中监听udev事件
    
    2
    
    #include <libudev.h>
    
    3
    
    struct udev *udev = udev_new();
    
    4
    
    struct udev_monitor *mon = udev_monitor_new_from_netlink(udev, "udev");
    
    5
    
    udev_monitor_filter_add_match_subsystem_devtype(mon, "usb", NULL);
    
    6
    
    udev_monitor_enable_receiving(mon);
    
    7
    
    int fd = udev_monitor_get_fd(mon);
    
    8
    
    // 配合epoll等待事件...

### Q114: Linux时间相关API？

> 🧠 **秒懂：** time(秒级)、gettimeofday(微秒级)、clock_gettime(纳秒级，CLOCK_MONOTONIC不受NTP影响)。嵌入式中测量时间间隔用CLOCK_MONOTONIC，墙钟时间用CLOCK_REALTIME。

嵌入式系统中时间处理的各种方式：
    
    
    1
    
    #include <time.h>
    
    2
    
    
    
    
    3
    
    // 1. 系统时间(日历时间)
    
    4
    
    time_t now = time(NULL);
    
    5
    
    struct tm *t = localtime(&now);
    
    6
    
    printf("%04d-%02d-%02d %02d:%02d:%02d\n",
    
    7
    
           t->tm_year+1900, t->tm_mon+1, t->tm_mday,
    
    8
    
           t->tm_hour, t->tm_min, t->tm_sec);
    
    9
    
    
    
    
    10
    
    // 2. 单调时钟(不受NTP/手动调时影响，适合计时)
    
    11
    
    struct timespec ts;
    
    12
    
    clock_gettime(CLOCK_MONOTONIC, &ts);
    
    13
    
    
    
    
    14
    
    // 3. 高精度计时
    
    15
    
    struct timespec start, end;
    
    10 collapsed lines
    
    16
    
    clock_gettime(CLOCK_MONOTONIC, &start);
    
    17
    
    do_work();
    
    18
    
    clock_gettime(CLOCK_MONOTONIC, &end);
    
    19
    
    long elapsed_ns = (end.tv_sec - start.tv_sec) * 1000000000L
    
    20
    
                    + (end.tv_nsec - start.tv_nsec);
    
    21
    
    
    
    
    22
    
    // 4. 睡眠
    
    23
    
    usleep(1000);        // 微秒(已废弃)
    
    24
    
    nanosleep(&ts, NULL); // 纳秒(推荐)
    
    25
    
    clock_nanosleep(CLOCK_MONOTONIC, 0, &ts, NULL); // 指定时钟源

### Q115: 嵌入式网络配置编程？

> 🧠 **秒懂：** 编程方式配置网络：ioctl(SIOCSIFADDR)设IP、socket路由表操作、system(‘ifconfig’)/system(‘ip’)调用命令。现代方式用Netlink(RTNETLINK)操作更规范。

程序中配置网络接口：
    
    
    1
    
    #include <net/if.h>
    
    2
    
    #include <sys/ioctl.h>
    
    3
    
    
    
    
    4
    
    // 获取IP地址
    
    5
    
    int fd = socket(AF_INET, SOCK_DGRAM, 0);
    
    6
    
    struct ifreq ifr;
    
    7
    
    strncpy(ifr.ifr_name, "eth0", IFNAMSIZ);
    
    8
    
    ioctl(fd, SIOCGIFADDR, &ifr);
    
    9
    
    struct sockaddr_in *addr = (struct sockaddr_in *)&ifr.ifr_addr;
    
    10
    
    printf("IP: %s\n", inet_ntoa(addr->sin_addr));
    
    11
    
    
    
    
    12
    
    // 设置IP地址(需root)
    
    13
    
    addr->sin_addr.s_addr = inet_addr("192.168.1.100");
    
    14
    
    ioctl(fd, SIOCSIFADDR, &ifr);
    
    15
    
    close(fd);

### Q116: Linux下多线程性能调优？

> 🧠 **秒懂：** 减少锁竞争(细粒度锁/读写锁/无锁)、降低伪共享(Cache Line对齐)、合理线程数(不超过CPU核数)、CPU亲和性绑核、减少上下文切换。用perf/valgrind分析瓶颈。

嵌入式Linux多线程程序性能优化：
    
    
    1
    
    // 1. 减少锁竞争
    
    2
    
    // - 缩小临界区
    
    3
    
    // - 读写锁(读多写少)
    
    4
    
    // - 无锁数据结构(环形队列)
    
    5
    
    // - 分段锁(将一个大锁拆成多个小锁)
    
    6
    
    
    
    
    7
    
    // 2. 避免false sharing(伪共享)
    
    8
    
    struct __attribute__((aligned(64))) ThreadData {
    
    9
    
        int counter;    // 每个线程独立, 各占一个缓存行
    
    10
    
        char pad[60];
    
    11
    
    };
    
    12
    
    
    
    
    13
    
    // 3. 使用thread pool(避免频繁创建/销毁)
    
    14
    
    
    
    
    15
    
    // 4. 绑定CPU(减少迁移开销)
    
    4 collapsed lines
    
    16
    
    cpu_set_t cpuset;
    
    17
    
    CPU_ZERO(&cpuset);
    
    18
    
    CPU_SET(core_id, &cpuset);
    
    19
    
    pthread_setaffinity_np(tid, sizeof(cpuset), &cpuset);

### Q117: Linux安全编程实践？

> 🧠 **秒懂：** 输入验证(防注入)、最小权限原则、不用system/popen(Shell注入)、检查返回值、避免缓冲区溢出(用snprintf不用sprintf)、使用安全函数、编译启用安全选项(-fstack-protector)。

嵌入式设备安全编程的基本原则：
    
    
    1
    
    // 1. 输入验证
    
    2
    
    int process_cmd(const char *input, size_t len) {
    
    3
    
        if (len > MAX_CMD_LEN) return -1;  // 长度检查
    
    4
    
        if (!is_valid_chars(input)) return -1;  // 字符白名单
    
    5
    
    }
    
    6
    
    
    
    
    7
    
    // 2. 缓冲区安全
    
    8
    
    char buf[64];
    
    9
    
    snprintf(buf, sizeof(buf), "%s", input);  // 不用sprintf
    
    10
    
    
    
    
    11
    
    // 3. 整数溢出检查
    
    12
    
    if (a > 0 && b > 0 && a > INT_MAX - b) {
    
    13
    
        // 溢出!
    
    14
    
    }
    
    15
    
    
    
    
    7 collapsed lines
    
    16
    
    // 4. 文件操作安全
    
    17
    
    // 检查文件权限、使用O_NOFOLLOW防止符号链接攻击
    
    18
    
    int fd = open(path, O_RDONLY | O_NOFOLLOW);
    
    19
    
    
    
    
    20
    
    // 5. 权限最小化
    
    21
    
    // 完成需要root的操作后立即降权
    
    22
    
    setuid(unprivileged_uid);

### Q118: 嵌入式Linux性能分析工具？

> 🧠 **秒懂：** perf(CPU热点分析)、strace(系统调用跟踪)、valgrind(内存检测)、gprof(函数耗时)、ftrace(内核函数跟踪)、top/htop(资源监控)。嵌入式性能优化先分析后优化。

性能分析是优化的基础：

Terminal window
    
    
    1
    
    # perf - Linux性能分析首选
    
    2
    
    perf stat ./myapp            # 统计CPU事件
    
    3
    
    perf record -g ./myapp       # 记录采样(含调用栈)
    
    4
    
    perf report                  # 分析采样结果
    
    5
    
    
    
    
    6
    
    # top/htop - 实时资源监控
    
    7
    
    top -H -p <pid>              # 查看线程级CPU使用
    
    8
    
    
    
    
    9
    
    # strace -c - 系统调用统计
    
    10
    
    strace -c ./myapp
    
    11
    
    
    
    
    12
    
    # valgrind - 内存分析
    
    13
    
    valgrind --tool=massif ./myapp   # 内存使用分析
    
    14
    
    valgrind --tool=callgrind ./myapp  # 函数调用分析
    
    15
    
    
    
    
    3 collapsed lines
    
    16
    
    # time - 简单计时
    
    17
    
    time ./myapp
    
    18
    
    # real(总时间) user(用户态CPU) sys(内核态CPU)

### Q119: Linux线程与进程的选择？

> 🧠 **秒懂：** 多进程：隔离性好(一个崩溃不影响其他)、在多CPU上并行好。多线程：共享数据方便、创建开销小。嵌入式选择：稳定性要求高用多进程，通信频繁用多线程。

面试常问”什么时候用多线程，什么时候用多进程”：

场景| 推荐| 原因  
---|---|---  
共享大量数据| 多线程| 线程天然共享地址空间  
需要隔离(一个崩不影响另一个)| 多进程| 地址空间独立  
高并发(>1000)| 多线程/协程| 进程创建开销大  
利用多核| 都行| 都能并行  
嵌入式实时| 多线程| 切换快、共享方便  
  
### Q120: 嵌入式配置文件解析(JSON/INI)？

> 🧠 **秒懂：** JSON解析：cJSON(轻量C库)、json-c。INI解析：iniparser或手写(逐行读取、按=分割)。嵌入式中配置文件用JSON(结构化好)或INI(简单直观)。注意文件不存在时的默认值处理。

嵌入式设备配置方案：
    
    
    1
    
    // 简易INI文件解析
    
    2
    
    int parse_ini(const char *path, const char *key, char *value, int len) {
    
    3
    
        FILE *fp = fopen(path, "r");
    
    4
    
        if (!fp) return -1;
    
    5
    
    
    
    
    6
    
        char line[256];
    
    7
    
        while (fgets(line, sizeof(line), fp)) {
    
    8
    
            // 跳过注释和空行
    
    9
    
            if (line[0] == '#' || line[0] == '\n') continue;
    
    10
    
    
    
    
    11
    
            char *eq = strchr(line, '=');
    
    12
    
            if (!eq) continue;
    
    13
    
            *eq = '\0';
    
    14
    
    
    
    
    15
    
            // 去除空格后比较键名
    
    15 collapsed lines
    
    16
    
            char *k = line, *v = eq + 1;
    
    17
    
            while (*k == ' ') k++;
    
    18
    
            while (*v == ' ') v++;
    
    19
    
            v[strcspn(v, "\r\n")] = '\0';
    
    20
    
    
    
    
    21
    
            if (strcmp(k, key) == 0) {
    
    22
    
                strncpy(value, v, len - 1);
    
    23
    
                value[len - 1] = '\0';
    
    24
    
                fclose(fp);
    
    25
    
                return 0;
    
    26
    
            }
    
    27
    
        }
    
    28
    
        fclose(fp);
    
    29
    
        return -1;
    
    30
    
    }

### Q121: Linux进程内存泄漏检测？

> 🧠 **秒懂：** Valgrind(最全面但慢5-10倍)、AddressSanitizer(编译时插桩，开销小)、mtrace(glibc内置)、/proc/PID/smaps监控内存增长。嵌入式中长期运行监控RSS增长趋势。

嵌入式长运行程序的内存泄漏排查：

Terminal window
    
    
    1
    
    # 方法1: 定期采样/proc/<pid>/status
    
    2
    
    watch -n 5 "grep VmRSS /proc/<pid>/status"
    
    3
    
    
    
    
    4
    
    # 方法2: Valgrind(开发阶段)
    
    5
    
    valgrind --leak-check=full --show-reachable=yes ./myapp
    
    6
    
    
    
    
    7
    
    # 方法3: mtrace(glibc内置)
    
    8
    
    # 代码中:
    
    9
    
    #include <mcheck.h>
    
    10
    
    mtrace();  // 开始跟踪
    
    11
    
    // ... 程序运行 ...
    
    12
    
    muntrace(); // 结束跟踪
    
    13
    
    # 设置环境变量: MALLOC_TRACE=trace.log ./myapp
    
    14
    
    # 分析: mtrace ./myapp trace.log

### Q122: 多线程程序中的错误处理？

> 🧠 **秒懂：** 多线程错误处理：返回错误码(不用errno，因为errno是线程本地的)、不在持锁期间调用可能失败的函数、使用RAII确保锁被释放、日志记录线程ID便于调试。

多线程错误处理与单线程不同：
    
    
    1
    
    // 1. errno是线程安全的(每个线程有独立errno)
    
    2
    
    // 但strerror()不是! 用strerror_r()
    
    3
    
    
    
    
    4
    
    char errbuf[128];
    
    5
    
    strerror_r(errno, errbuf, sizeof(errbuf));  // 线程安全
    
    6
    
    
    
    
    7
    
    // 2. 线程内设置退出码
    
    8
    
    void *thread_func(void *arg) {
    
    9
    
        int *result = malloc(sizeof(int));
    
    10
    
        *result = do_work();
    
    11
    
        if (*result < 0) {
    
    12
    
            *result = -1;
    
    13
    
            return result;
    
    14
    
        }
    
    15
    
        return result;
    
    6 collapsed lines
    
    16
    
    }
    
    17
    
    
    
    
    18
    
    // 3. 全局错误状态需要保护
    
    19
    
    pthread_mutex_lock(&err_lock);
    
    20
    
    g_last_error = error_code;
    
    21
    
    pthread_mutex_unlock(&err_lock);

### Q123: Linux能力(capabilities)机制？

> 🧠 **秒懂：** capabilities将root权限细分为多个独立能力(如CAP_NET_RAW网络原始权限、CAP_SYS_BOOT重启)。进程只授予需要的能力而非full root。嵌入式中减少安全攻击面。

精细化权限控制(替代root全有或全无)：

Terminal window
    
    
    1
    
    # 查看程序capabilities
    
    2
    
    getcap /usr/bin/ping
    
    3
    
    # 输出: /usr/bin/ping = cap_net_raw+ep (可以发原始包,不需要root)
    
    4
    
    
    
    
    5
    
    # 设置capabilities
    
    6
    
    setcap cap_net_bind_service+ep myapp  # 允许绑定<1024端口
    
    7
    
    
    
    
    8
    
    # 代码中降低权限
    
    9
    
    #include <sys/capability.h>
    
    10
    
    cap_t caps = cap_get_proc();
    
    11
    
    cap_clear(caps);
    
    12
    
    cap_set_flag(caps, CAP_PERMITTED, 1, &cap_net_raw, CAP_SET);
    
    13
    
    cap_set_proc(caps);
    
    14
    
    cap_free(caps);

### Q124: 嵌入式OTA升级(Linux层)？

> 🧠 **秒懂：** 嵌入式Linux OTA：A/B双分区→下载新固件到备用分区→校验(CRC/签名)→修改启动标志→重启进入新分区→启动成功确认→失败自动回退。SWUpdate/RAUC是成熟的OTA框架。

Linux设备远程升级实现：

Terminal window
    
    
    1
    
    # 典型方案: SWUpdate
    
    2
    
    # 1. 双rootfs分区(A/B切换)
    
    3
    
    # 2. 下载更新包(.swu)
    
    4
    
    # 3. 校验签名
    
    5
    
    # 4. 写入非活动分区
    
    6
    
    # 5. 切换启动标志(如U-Boot环境变量)
    
    7
    
    # 6. 重启验证
    
    8
    
    
    
    
    9
    
    # 升级脚本示例
    
    10
    
    #!/bin/bash
    
    11
    
    CURRENT=$(cat /proc/cmdline | grep -o "root=[^ ]*" | cut -d= -f2)
    
    12
    
    if [ "$CURRENT" = "/dev/mmcblk0p2" ]; then
    
    13
    
        TARGET="/dev/mmcblk0p3"
    
    14
    
    else
    
    15
    
        TARGET="/dev/mmcblk0p2"
    
    5 collapsed lines
    
    16
    
    fi
    
    17
    
    
    
    
    18
    
    dd if=rootfs.img of=$TARGET bs=4M
    
    19
    
    fw_setenv bootpart $TARGET
    
    20
    
    reboot

### Q125: 嵌入式系统安全加固？

> 🧠 **秒懂：** 安全加固：最小化系统(去掉不需要的服务和命令)→安全启动(Secure Boot验证签名)→文件系统只读(squashfs)→SELinux/AppArmor访问控制→加密通信(TLS)→禁用调试接口。

嵌入式Linux产品安全加固措施：

Terminal window
    
    
    1
    
    # 1. 关闭不需要的服务
    
    2
    
    systemctl disable telnet ssh(生产环境)
    
    3
    
    
    
    
    4
    
    # 2. 文件系统只读
    
    5
    
    mount -o remount,ro /
    
    6
    
    
    
    
    7
    
    # 3. 限制root登录
    
    8
    
    # /etc/securetty 为空
    
    9
    
    
    
    
    10
    
    # 4. 内核加固
    
    11
    
    echo 1 > /proc/sys/kernel/randomize_va_space  # ASLR
    
    12
    
    echo 0 > /proc/sys/kernel/kptr_restrict        # 隐藏内核地址
    
    13
    
    
    
    
    14
    
    # 5. 安全启动链
    
    15
    
    # BootROM验证U-Boot签名 → U-Boot验证内核签名 → 内核验证rootfs
    
    6 collapsed lines
    
    16
    
    
    
    
    17
    
    # 6. 应用层
    
    18
    
    # - 最小权限原则(不以root运行)
    
    19
    
    # - 输入验证
    
    20
    
    # - 加密敏感数据
    
    21
    
    # - 安全通信(TLS)

* * *

* * *

## ★ 面经高频补充题（来源：GitHub面经仓库/牛客讨论区/大厂真题整理）

### Q126: 多线程编程中如何避免死锁？

> 🧠 **秒懂：** ①固定加锁顺序(所有线程按相同顺序获取锁) ②使用pthread_mutex_trylock(失败后释放已有锁重试) ③减少锁的持有时间和范围。

> 💡 **面试高频** | 牛客面经高频 | 追问”手写死锁检测”是加分项

**死锁四个必要条件（缺一不死锁）：**

  1. 互斥: 资源独占
  2. 持有并等待: 持有A等B
  3. 不可剥夺: 不能强制抢
  4. 循环等待: A等B, B等A



**嵌入式避免死锁的实践：**
    
    
    1
    
    // 方法1: 固定加锁顺序(打破循环等待)
    
    2
    
    // 规则: 永远先锁mutex_A再锁mutex_B
    
    3
    
    pthread_mutex_lock(&mutex_A);  // 所有线程都先锁A
    
    4
    
    pthread_mutex_lock(&mutex_B);  // 再锁B
    
    5
    
    // ... 临界区 ...
    
    6
    
    pthread_mutex_unlock(&mutex_B);
    
    7
    
    pthread_mutex_unlock(&mutex_A);
    
    8
    
    
    
    
    9
    
    // 方法2: 超时锁(trylock)
    
    10
    
    if (pthread_mutex_trylock(&mutex_B) != 0) {
    
    11
    
        pthread_mutex_unlock(&mutex_A);  // 拿不到B就释放A
    
    12
    
        usleep(1000);  // 退避重试
    
    13
    
        continue;
    
    14
    
    }
    
    15
    
    
    
    
    1 collapsed line
    
    16
    
    // 方法3: 减少锁粒度(用多个小锁代替大锁)

* * *

### Q127: fork后子进程和父进程的文件描述符关系？

> 🧠 **秒懂：** fork后子进程继承父进程打开的文件描述符副本(指向相同的file结构)。父子进程共享文件偏移量。关闭一方的fd不影响另一方。管道通信就利用了这一特性。

> 💡 **面试高频** | 牛客面经常见 | 追问”多进程写同一文件”
    
    
    1
    
    fork之前:
    
    2
    
      父进程 fd=3 → [文件表项: offset=100, flags] → [inode]
    
    3
    
    
    
    
    4
    
    fork之后:
    
    5
    
      父进程 fd=3 ──┐
    
    6
    
                     ├→ [同一文件表项: offset=100] → [inode]
    
    7
    
      子进程 fd=3 ──┘
    
    8
    
    
    
    
    9
    
    关键点:
    
    10
    
      1. 父子进程共享同一文件表项(共享偏移量!)
    
    11
    
      2. 父进程写入后offset变化,子进程也看到(因为共享)
    
    12
    
      3. 这就是为什么重定向在fork后对两个进程都生效
    
    13
    
      4. 如果子进程exec了,fd默认继承(除非FD_CLOEXEC)

> 💡 **面试追问：** “两个进程分别open同一文件呢？” → 各有独立的文件表项(不同offset),互不影响。

* * *

### Q128: 静态库和动态库的区别？

> 🧠 **秒懂：** 静态库在链接时全部打包进可执行文件，动态库运行时加载。静态库用ar打包(.a)，动态库用gcc -shared编译(.so)。嵌入式小系统多用静态链接。

> 💡 **面试高频** | 编译链接必考 | 牛客面经高频

对比项| 静态库(.a)| 动态库(.so)  
---|---|---  
链接时机| 编译时复制进可执行文件| 运行时动态加载  
文件大小| 大(库代码打包进去)| 小(只存引用)  
内存占用| 每个进程一份副本| 多进程共享一份  
更新| 要重新编译| 替换.so即可  
依赖| 无外部依赖| 依赖.so存在  
嵌入式选择| **MCU多用★**(简单可控)| Linux应用多用  
  
Terminal window
    
    
    1
    
    # 创建静态库
    
    2
    
    gcc -c mylib.c -o mylib.o
    
    3
    
    ar rcs libmy.a mylib.o
    
    4
    
    gcc main.c -L. -lmy -o main  # 链接
    
    5
    
    
    
    
    6
    
    # 创建动态库
    
    7
    
    gcc -fPIC -shared mylib.c -o libmy.so
    
    8
    
    gcc main.c -L. -lmy -o main
    
    9
    
    export LD_LIBRARY_PATH=.  # 运行时要找到.so

* * *

### Q129: 如何实现一个线程安全的单例模式？

> 🧠 **秒懂：** C++11 Meyers’ Singleton(局部static变量)最简洁安全。C语言用pthread_once保证初始化只执行一次。双检锁(DCLP)需要配合内存屏障/atomic。

> 💡 **面试高频** | C/C++设计模式题 | 牛客面经常见
    
    
    1
    
    // C语言实现线程安全单例(pthread_once)
    
    2
    
    #include <pthread.h>
    
    3
    
    
    
    
    4
    
    typedef struct {
    
    5
    
        int data;
    
    6
    
        // ... 其他成员
    
    7
    
    } Singleton;
    
    8
    
    
    
    
    9
    
    static Singleton *instance = NULL;
    
    10
    
    static pthread_once_t once_control = PTHREAD_ONCE_INIT;
    
    11
    
    
    
    
    12
    
    static void init_singleton(void) {
    
    13
    
        instance = (Singleton*)malloc(sizeof(Singleton));
    
    14
    
        instance->data = 0;
    
    15
    
    }
    
    5 collapsed lines
    
    16
    
    
    
    
    17
    
    Singleton* get_instance(void) {
    
    18
    
        pthread_once(&once_control, init_singleton);
    
    19
    
        return instance;
    
    20
    
    }

* * *

### Q130: 动态加载和静态加载的区别？与动态库/静态库有什么关系？

> 🧠 **秒懂：** 静态加载：链接时确定库的位置(编译期绑定)。动态加载：运行时dlopen按需加载(运行期绑定)。静态库只能静态加载，动态库两种都支持。dlopen实现的插件机制最灵活。

**答：**

**三种加载方式对比：**

方式| 静态加载(Static Loading)| 动态加载-隐式(Implicit)| 动态加载-显式(Explicit)  
---|---|---|---  
对应库| 静态库(.a)| 动态库(.so)| 动态库(.so)  
链接时机| **编译时** 链接器复制代码| **启动时** 动态链接器加载| **运行时** 程序主动dlopen  
链接命令| `gcc -static -lxxx`| `gcc -lxxx`(默认)| 编译时不链接,代码中dlopen  
可执行文件| 大(包含库代码)| 小(只存符号引用)| 小  
运行依赖| 无(自包含)| 要求.so在LD_LIBRARY_PATH| 要求.so运行时可找到  
更新库| 重新编译| 替换.so重启程序| 替换.so,无需重启  
典型场景| 嵌入式MCU/容器部署| Linux应用程序默认方式| **插件系统/热更新**  
  
**完整代码示例：**
    
    
    1
    
    // ===== 1. 静态加载 =====
    
    2
    
    // 编译: gcc main.c -L. -lmath_static -static -o app
    
    3
    
    // 库代码在编译时已嵌入app, 运行时无需任何.so
    
    4
    
    #include "mymath.h"
    
    5
    
    int main() {
    
    6
    
        int r = add(1, 2);  // 直接调用,函数地址编译时确定
    
    7
    
        return 0;
    
    8
    
    }
    
    9
    
    
    
    
    10
    
    // ===== 2. 动态加载-隐式 =====
    
    11
    
    // 编译: gcc main.c -L. -lmath -o app
    
    12
    
    // 运行: LD_LIBRARY_PATH=. ./app
    
    13
    
    // 启动时ld-linux.so自动加载libmath.so
    
    14
    
    #include "mymath.h"
    
    15
    
    int main() {
    
    21 collapsed lines
    
    16
    
        int r = add(1, 2);  // 通过PLT/GOT间接调用(运行时解析真实地址)
    
    17
    
        return 0;
    
    18
    
    }
    
    19
    
    
    
    
    20
    
    // ===== 3. 动态加载-显式(dlopen) =====
    
    21
    
    // 编译: gcc main.c -ldl -o app  (注意:不需要-lmath)
    
    22
    
    #include <dlfcn.h>
    
    23
    
    int main() {
    
    24
    
        // 运行时手动加载
    
    25
    
        void *handle = dlopen("./libmath.so", RTLD_LAZY);
    
    26
    
        if (!handle) { fprintf(stderr, "%s\n", dlerror()); return 1; }
    
    27
    
    
    
    
    28
    
        // 通过名字查找函数地址
    
    29
    
        typedef int (*add_func)(int, int);
    
    30
    
        add_func add = (add_func)dlsym(handle, "add");
    
    31
    
    
    
    
    32
    
        int r = add(1, 2);   // 通过函数指针调用
    
    33
    
    
    
    
    34
    
        dlclose(handle);      // 卸载
    
    35
    
        return 0;
    
    36
    
    }

**ELF可执行文件中的区别：**

Terminal window
    
    
    1
    
    # 静态链接: 无动态段
    
    2
    
    $ file app_static
    
    3
    
    app_static: ELF 64-bit, statically linked
    
    4
    
    
    
    
    5
    
    # 动态链接: 依赖.so
    
    6
    
    $ file app_dynamic
    
    7
    
    app_dynamic: ELF 64-bit, dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2
    
    8
    
    
    
    
    9
    
    $ ldd app_dynamic
    
    10
    
        libmath.so => ./libmath.so
    
    11
    
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
    
    12
    
        /lib64/ld-linux-x86-64.so.2

**PLT/GOT延迟绑定(隐式动态加载的核心)：**
    
    
    1
    
    程序调用add()
    
    2
    
        │
    
    3
    
        ▼
    
    4
    
    PLT[add]  (Procedure Linkage Table,程序链接表)
    
    5
    
        │  第一次调用 → 跳到动态链接器解析真实地址,写入GOT
    
    6
    
        │  后续调用 → 直接从GOT读地址跳转(已缓存)
    
    7
    
        ▼
    
    8
    
    GOT[add]  (Global Offset Table,全局偏移表)
    
    9
    
        │  存放add()在.so中的真实虚拟地址
    
    10
    
        ▼
    
    11
    
    libmath.so中的add()真实代码

> 💡 **面试追问：** 动态库的显式加载(dlopen)在嵌入式Linux中的实际应用场景？→ ①插件系统(加载不同传感器驱动.so)；②OTA热更新(替换.so不重启主程序)；③减少启动内存(按需加载功能模块)；④A/B版本切换(dlopen不同版本的算法.so)。

* * *
