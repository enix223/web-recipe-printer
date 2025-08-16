import { PageContainer } from '@ant-design/pro-components';
import { App, Button } from 'antd';
import { useCallback, useEffect, useRef } from 'react';
const HomePage = () => {
  const selectedDevice = useRef<USBDevice>();
  const { message } = App.useApp();
  const inited = useRef<boolean>(false);

  const getEndpoint = useCallback((device: USBDevice) => {
    let inEndpoint = undefined;
    let outEndpoint = undefined;

    for (const { alternates } of device.configuration!.interfaces) {
      const alternate = alternates[0];
      const USB_PRINTER_CLASS = 7;
      if (alternate.interfaceClass !== USB_PRINTER_CLASS) {
        continue;
      }

      for (const endpoint of alternate.endpoints) {
        if (endpoint.type !== 'bulk') {
          continue;
        }

        if (endpoint.direction === 'in') {
          inEndpoint = endpoint.endpointNumber;
        } else if (endpoint.direction === 'out') {
          outEndpoint = endpoint.endpointNumber;
        }
      }
    }

    return {
      inEndpoint,
      outEndpoint,
    };
  }, []);

  const getDevice = useCallback(async () => {
    const device = await navigator.usb
      .requestDevice({ filters: [] })
      .then((device) => {
        return device;
      })
      .catch(() => {
        return null;
      });
    return device;
  }, []);

  const initDevice = useCallback(async (device: USBDevice) => {
    await device.open();
    console.log('device.configuration', device.configuration);
    const { configurationValue, interfaces } = device.configuration!;
    await device.selectConfiguration(configurationValue || 0);
    for (const intf of interfaces) {
      await device.claimInterface(intf.interfaceNumber || 0);
      if (intf.alternates.length > 0) {
        for (const alternate of intf.alternates) {
          await device.selectAlternateInterface(
            intf.interfaceNumber,
            alternate.alternateSetting,
          );
        }
      }
    }
    console.log('打开设备成功');
  }, []);

  const connect = useCallback(async () => {
    let device = await getDevice();
    if (!device) {
      return;
    }
    selectedDevice.current = device;
    await initDevice(device);
  }, []);

  const sendCmd = useCallback(async () => {
    if (!selectedDevice.current) {
      message.error({ content: 'please pair device first' });
      return;
    }

    const hide = message.loading({ content: '打印中', duration: 0 });
    try {
      const { outEndpoint } = getEndpoint(selectedDevice.current);
      if (!inited.current) {
        console.log('执行初始化');
        const init = new Uint8Array([0x1b, 0x40]); // ESC @
        const res = await selectedDevice.current.transferOut(
          outEndpoint!,
          init,
        ); // reset printer
        console.log('初始化成功', res);
        inited.current = true;
      }

      console.log('执行打印');
      const encoder = new TextEncoder();
      const text = encoder.encode('Hello World\n'); // ASCII
      const res = await selectedDevice.current.transferOut(outEndpoint!, text); // print text
      console.log('打印成功', res);
      setTimeout(() => {
        message.success({ content: '打印成功' });
      }, 500);
    } catch (e) {
      setTimeout(() => {
        message.error({ content: '打印失败' });
      }, 500);
      console.error('打印失败', e);
    } finally {
      hide();
    }
  }, []);

  useEffect(() => {
    navigator.usb.addEventListener('connect', (e) => {
      message.success({ content: 'printer connected' });
      console.log('printer connected', e);
    });

    navigator.usb.addEventListener('disconnect', (e) => {
      message.error({ content: 'printer disconnected' });
      console.error('printer disconnected', e);
    });
  }, []);

  return (
    <PageContainer ghost title="Web Printer">
      <div className="flex flex-row gap-1">
        <Button onClick={connect}>Connect</Button>
        <Button onClick={sendCmd}>Print</Button>
      </div>
    </PageContainer>
  );
};

export default HomePage;
