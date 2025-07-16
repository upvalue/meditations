import cx from 'classnames'
export const Icon = ({
  icon: IconComponent,
  className,
}: {
  icon: React.ComponentType<{ className: string }>
  className?: string
}) => {
  return <IconComponent className={cx('size-[14px]', className)} />
}
