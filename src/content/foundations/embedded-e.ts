import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C block for lesson prose. */
const c = (s: string) => "~~~c\n" + s.trim() + "\n~~~";
/** Fenced Python block for lesson prose. */
const py = (s: string) => "~~~python\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 13. Drivers and accelerators on an SoC: a Linux program and a kernel driver reach the same chip; a model runs on an NPU. */
export const emb13DriversAccel: ConceptLesson = {
  id: "fnd-emb-13-drivers-accel",
  title: "Drivers and accelerators on an SoC",
  summary: "Reach a sensor from Linux user space and from a kernel driver, then split a model between the CPU and an NPU, and see why shared memory matters.",
  minutes: 12,
  xp: 90,
  level: "Professional",
  steps: [
    // 1
    {
      kind: "explain",
      title: "Hardware from user space",
      body: P(
        "In *SoCs: many processors on one chip* the kernel matched a device-tree node to a driver. You can also reach a chip **without writing a driver**. Linux has a generic driver, **i2c-dev**, that shows each I²C bus as a file such as `/dev/i2c-1`. A normal program opens it and sends the same transactions you met in *Talking to other chips*. Here is the TMP102 temperature sensor at address 0x48:",
        c(`
#include <fcntl.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <unistd.h>

int fd = open("/dev/i2c-1", O_RDWR);   // bus 1
ioctl(fd, I2C_SLAVE, 0x48);            // talk to 7-bit address 0x48
unsigned char reg = 0x00, b[2];
write(fd, &reg, 1);                    // point at the temperature register
read(fd, b, 2);                        // msb, lsb
`),
        "Decode `b` as in *Talking to other chips*: the top 12 bits are the reading, 0.0625 °C per step. Real code checks every return value: `open` and `ioctl` return −1 on failure, and `read` and `write` return how many bytes moved.",
        "Two details. First, `write` then `read` ends the first transaction with a STOP before the second starts. The TMP102 keeps its register pointer, so that works. A chip that needs a **repeated START** between the two needs the `I2C_RDWR` ioctl instead. Second, the ioctl fails with **EBUSY** if a kernel driver already owns that address (`I2C_SLAVE_FORCE` overrides this, but it is a bad idea: two drivers fight over one chip).",
        "To see what is on the bus, run `i2cdetect -y 1` (from the i2c-tools package). It lists the addresses that answer. The `/dev/i2c-1` file needs the i2c-dev module loaded and permission to open it.",
        "User space is a good way to **prototype**. A **kernel driver** is better when the device needs interrupts or tight timing, or should appear as a standard interface that every program already understands.",
      ),
    },
    // 2
    {
      kind: "question",
      title: "What the ioctl does",
      body: "Look again at `ioctl(fd, I2C_SLAVE, 0x48);` in the program above. What does this one call do?",
      question: {
        type: "choice",
        options: [
          "Sends the address byte 0x48 on the bus right away",
          "Sets the address that later reads and writes go to",
          "Loads the driver for the device at 0x48",
          "Makes this computer answer as device 0x48",
        ],
        answer: 1,
        hint: "The call remembers something about this file handle. When is anything sent?",
        feedback: {
          0: "Nothing goes on the wire yet. The address is sent as part of the first write or read.",
          2: "i2c-dev is one generic driver for the whole bus. It does not load a driver for each chip.",
          3: "The Linux computer is the controller. It addresses the chip at 0x48 and does not pose as it.",
        },
      },
      explanation: "The ioctl only stores the **target address** in the open file. Each later `write` or `read` on `fd` then starts a transaction to that address. The constant is called `I2C_SLAVE` for historical reasons: it names the other end of the conversation, which this course calls the target or device.",
    },
    // 3
    {
      kind: "question",
      title: "What makes probe() run?",
      body: P(
        "Here is the skeleton of a kernel driver for the same chip. It is a module in the kernel's own C dialect (the real one is `drivers/hwmon/tmp102.c`).",
        c(`
static const struct of_device_id tmp_of_match[] = {
    { .compatible = "ti,tmp102" },
    { }
};
MODULE_DEVICE_TABLE(of, tmp_of_match);

static int tmp_probe(struct i2c_client *client)
{
    /* client->addr is 0x48, taken from reg = <0x48> */
    /* check the chip, allocate state, register a hwmon device ... */
    return 0;
}

static struct i2c_driver tmp_driver = {
    .driver = { .name = "tmp-demo", .of_match_table = tmp_of_match },
    .probe = tmp_probe,
};
module_i2c_driver(tmp_driver);
`),
        "Recent kernels pass `probe` just the client, as above. Older ones had `probe(client, id)`, and some in between called it `probe_new`: check your kernel's headers. The device tree from the last lesson has a node with `compatible = \"ti,tmp102\"` and `reg = <0x48>`. What makes the kernel call `tmp_probe`?",
      ),
      question: {
        type: "choice",
        options: [
          "Loading the module calls probe once at load time",
          "The sensor raises an interrupt when it powers up",
          "A program opening /dev/i2c-1 triggers it",
          "A device-tree node whose compatible matches the table",
        ],
        answer: 3,
        hint: "Look at what the table holds, and which part of the device tree it is compared with.",
        feedback: {
          0: "Loading only registers the driver. probe runs once for each matching device, which could be none or several.",
          1: "The TMP102 is a passive target and knows nothing about the kernel. The bus core finds it from the device tree.",
          2: "i2c-dev is a separate generic driver. Opening its file does not bind your driver to the chip.",
        },
      },
      explanation: "The **bus core** keeps a list of devices (made from the device tree) and a list of drivers (each with its match table). Whenever a device and a driver match, in whichever order they appeared, it calls the driver's `probe` for that device. When either goes away, it calls `remove`. `MODULE_DEVICE_TABLE` also exports the table, so **udev** can load the module automatically when a matching device shows up.",
    },
    // 4
    {
      kind: "question",
      title: "From node to /sys",
      body: "Put these events in order for a driver like `tmp_driver`, after its module is loaded and the device-tree node exists.",
      question: {
        type: "order",
        items: [
          "The I²C core matches the client's compatible string to the driver's table",
          "The core calls the driver's probe() with that client",
          "probe() registers a hwmon device for the chip",
          "A temp1_input file appears under /sys/class/hwmon/",
          "A program reads the temperature, in millidegrees, from that file",
        ],
        hint: "Each step needs something that the step before it created.",
      },
      explanation: "The driver turns a raw chip into a **standard interface**. The hardware-monitoring (**hwmon**) subsystem shows a temperature as a text file, `temp1_input`, in **millidegrees Celsius**: 23,500 means 23.5 °C. A program such as `cat` or a monitoring tool needs to know nothing about I²C addresses or register layouts. That is the real gain over the user-space version.",
    },
    // 5
    {
      kind: "explain",
      title: "Delegates and fallback",
      body: P(
        "Now the other half of an SoC: the **accelerators**. An ML runtime reads a model as a graph of operations (convolution, pooling, activation, ...). It cannot hand the whole graph to the NPU unless the NPU supports every operation in it. So it splits the graph into **partitions**: each run of operations that the accelerator's **delegate** supports goes to the NPU (or GPU), and the rest **fall back** to the CPU.",
        "Every border between two partitions costs a **hand-over**: copying or cache maintenance, synchronisation, and waking the other engine. A model with many small partitions can run barely faster than on the CPU alone, even if the NPU is very fast on its own partitions.",
        "In LiteRT (the successor of TensorFlow Lite) loading a delegate looks like this, for example:",
        py(`
from ai_edge_litert.interpreter import Interpreter, load_delegate
npu = load_delegate("libvendor_npu_delegate.so")   # the vendor's library
it = Interpreter(model_path="model_int8.tflite", experimental_delegates=[npu])
it.allocate_tensors()
`),
        "The library name is a placeholder: each chip vendor ships its own. ONNX Runtime has the same idea under the name **execution providers**. Many runtimes log how many partitions they made, and that line is the first thing to check when a model is slower than hoped.",
        "Honest costs: delegates differ per chip, and some need a specific kind of quantisation (int8 per tensor or per channel) or a specific version of an operation. A model that runs on one NPU may need changes for the next.",
      ),
    },
    // 6
    {
      kind: "question",
      title: "Get it onto the NPU",
      body: P(
        "This small network has 9 layers. It starts as an int8 model on the NPU delegate, and the log shows 3 partitions: the runtime had to run one layer on the CPU. Change the settings until the model runs as **one partition** in **6 ms or less**.",
        "Try each control and read the log, the partition list and the time. Accuracy is not simulated here: in a real project you would check it after every change.",
      ),
      widget: { type: "emb-delegate", props: { engine: "npu", quant: "int8", act: "hardswish" } },
      question: {
        type: "widget",
        goal: { engine: "npu", maxPartitions: 1, maxMs: 6 },
        prompt: "Run the model on the NPU delegate as one partition, in 6 ms or less.",
        hint: "Find which layer the delegate cannot take, and what you can swap it for.",
      },
      explanation: "The NPU delegate has no kernel for **HardSwish**, so that layer fell back to the CPU: 3 partitions and 2 hand-overs (4.7 ms in this toy). Swapping it for **ReLU6**, which the NPU supports, gives one partition at 2.6 ms. The other settings fail: the GPU delegate takes every layer but is slower (about 8 ms), the NPU on a float32 model takes nothing (about 24 ms, all on the CPU), and the CPU alone is slowest. The swap changes the network, so a real project must retrain or re-export it and **check the accuracy**.",
    },
    // 7
    {
      kind: "question",
      title: "Where the time goes",
      body: P(
        "A model takes **20 ms** on the CPU. **95%** of that work moves to an NPU that runs it **10× faster**. The other 5% stays on the CPU. The graph splits into 3 partitions, so there are **2 hand-overs of 0.5 ms** each.",
        "Work out the total time per inference in ms.",
      ),
      question: { type: "number", answer: 3.9, tolerance: 0.05, unit: "ms", hint: "Add three parts: the work on the NPU, the work left on the CPU, and the hand-overs." },
      explanation: "NPU part: 0.95 × 20 = 19 ms of CPU-time work, ÷ 10 = **1.9 ms**. CPU part: 0.05 × 20 = **1 ms**. Hand-overs: 2 × 0.5 = **1 ms**. Total **3.9 ms**. The speed-up is 20 ÷ 3.9 ≈ **5.1×**, not 10×: the CPU part and the hand-overs are now about half of the time. This is **Amdahl's law** again (*Many cores: why 8 cores is not 8x faster*), with a hand-over tax added.",
    },
    // 8
    {
      kind: "question",
      title: "One pointer, two memories",
      body: P(
        "Accelerators need data in memory they can reach. On an **SoC**, the CPU, GPU and NPU all use **one physical DRAM**. An accelerator can read a CPU buffer **in place** (**zero-copy**). You pay only for cache maintenance, or nothing on hardware-coherent paths (see *The cache trap* in *DMA: moving data without the CPU*). Typical routes are OpenCL buffers made with `CL_MEM_ALLOC_HOST_PTR` or `CL_MEM_USE_HOST_PTR`, and **dma-buf** handles that pass a buffer between Linux drivers.",
        "A **PC GPU** has its own memory across PCIe (*Links between chips*). CUDA's `cudaMallocManaged` hides this: you get **one pointer valid on both sides**. On a PC, the driver **migrates pages** between CPU RAM and GPU memory when one side touches them. On a Jetson-class SoC the memory is physically shared, so no such trip exists.",
        "Now a case. A CUDA program on a desktop PC with a discrete GPU allocates its arrays with `cudaMallocManaged`. The kernel was already loaded and compiled before timing started. The first launch takes about 40 ms, and later identical launches about 2 ms. The profiler shows many **GPU page faults** and **host-to-device migrations** during the first launch, and none later. Why is the first launch so much slower?",
      ),
      question: {
        type: "choice",
        options: [
          "The first touches migrate pages over PCIe",
          "Managed memory stays in CPU RAM for good",
          "The kernel's machine code is built at first launch",
          "The GPU only clocks up after its first kernel",
        ],
        answer: 0,
        hint: "Which of the four causes would show up as page faults and migrations in the profiler?",
        feedback: {
          1: "If the data stayed in CPU RAM, every launch would be slow, not just the first. Here later launches are fast.",
          2: "JIT compilation can slow a first launch, but here the kernel was already built, and the profiler shows migrations, not compiling.",
          3: "A clock ramp-up is a real first-launch cost, but it would not appear as page faults or host-to-device migrations.",
        },
      },
      explanation: "The pages start in CPU RAM. The first time the GPU touches each page, it **faults**, and the driver copies the page across PCIe into GPU memory. After that the data is there and the kernel runs at full speed. You can avoid the stall by **prefetching** (`cudaMemPrefetchAsync`) before the launch. On an SoC with truly shared memory this migration cost mostly disappears, which is a big reason edge boards avoid copies. JIT builds and clock ramps are real first-launch costs too, which is why you check the profiler before guessing.",
    },
    // 9
    {
      kind: "explain",
      title: "In practice",
      body: P(
        "You can try all of this on cheap boards. A **Raspberry Pi** or a **BeaglePlay** and a TMP102 breakout board are enough for the driver half:",
        "- Wire the sensor to the I²C pins, then run `i2cdetect -y 1`. You should see 48.\n- Bind the in-tree driver with a **device-tree overlay**. On Raspberry Pi OS, for example, the `i2c-sensor` overlay lists the TMP102 among its options (read the overlay's README for its exact parameters). Then read `/sys/class/hwmon/`.\n- Build your own **out-of-tree module** against the board's kernel headers, and compare it with `drivers/hwmon/tmp102.c`.",
        "For accelerators, use a board with an NPU. Examples, with no favourite: the NXP i.MX 8M Plus, a Rockchip RK3588 board, or an NVIDIA Jetson Orin Nano. Prices are typically tens to a few hundred dollars. Then load the vendor's delegate and read the partition count in the log.",
        "Be honest about the costs. **Kernel APIs change** between versions, so pin your kernel version. **Vendor NPU stacks** are often closed, or need an agreement before you can download them. A driver tied to a **proprietary blob** makes every kernel update harder. A driver that is **upstream** in the mainline kernel is the cheapest in the long run, because the community keeps it working.",
      ),
    },
    // 10
    {
      kind: "recap",
      points: [
        "From user space, **i2c-dev** gives `/dev/i2c-N`: `ioctl(fd, I2C_SLAVE, addr)` picks the target, then `read` and `write` run transactions. It is good for prototypes and fails with EBUSY if a kernel driver owns the address.",
        "A **kernel driver** has a match table (`of_device_id`) and a `probe`. The bus core calls `probe` for each device-tree node whose `compatible` matches. The driver then exposes a standard interface, such as a hwmon file in millidegrees.",
        "An ML runtime splits a model into **partitions**. A **delegate** runs the operations it supports on the NPU or GPU, and the rest fall back to the CPU. Every border costs a **hand-over**, so fewer partitions usually mean faster.",
        "Time per inference = accelerated work + CPU work + hand-overs. The speed-up is less than the accelerator's raw speed (Amdahl's law).",
        "On an SoC the CPU, GPU and NPU share one DRAM, so **zero-copy** buffers are possible. On a PC GPU, managed memory migrates pages over PCIe, and the first touch is slow.",
      ],
    },
  ],
};
